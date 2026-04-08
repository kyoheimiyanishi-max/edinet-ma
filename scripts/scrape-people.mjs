// scripts/scrape-people.mjs
//
// 人物DB拡張スクレイパー（Wikipedia / gBizINFO / EDINET DB）
// 既存 data/people.json を保持しつつ、3ソースから新規エントリを追加する。
//
// Usage:
//   node scripts/scrape-people.mjs              # 全ソース実行
//   SOURCES=wikipedia node scripts/scrape-people.mjs
//   SOURCES=wikipedia,gbiz,edinet node scripts/scrape-people.mjs
//   TARGET=1500 node scripts/scrape-people.mjs  # 目標件数（default 1100）

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data/people.json");
const ENV_PATH = join(ROOT, ".env");

// ---- env loader ----
function loadEnv() {
  if (!existsSync(ENV_PATH)) return;
  const text = readFileSync(ENV_PATH, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null) process.env[k] = v;
  }
}
loadEnv();

const SOURCES = (process.env.SOURCES ?? "wikipedia,gbiz,edinet")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TARGET = Number(process.env.TARGET ?? 1100);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Person normalizer ----
function normalizeName(name) {
  return (name || "")
    .replace(/[\s\u3000]+/g, "")
    .replace(/[（）()「」『』、,。.・]/g, "")
    .toLowerCase();
}

// 既存 + 新規エントリを name キーで dedupe
function makeDeduper(existing) {
  const seen = new Map();
  for (const p of existing) {
    const k = normalizeName(p.name);
    if (k) seen.set(k, p);
  }
  return {
    has(name) {
      return seen.has(normalizeName(name));
    },
    add(person) {
      const k = normalizeName(person.name);
      if (!k || seen.has(k)) return false;
      seen.set(k, person);
      return true;
    },
    size: () => seen.size,
    values: () => Array.from(seen.values()),
  };
}

// ---- Wikipedia (MediaWiki API) ----

const WIKI_API = "https://ja.wikipedia.org/w/api.php";
const WIKI_UA = "edinet-ma-people-scraper/0.1 (research/internal use)";

// 取得対象カテゴリ（表記は Wikipedia 上のカテゴリ名）
// category → people のカテゴリへのマッピング
const WIKI_CATEGORIES = [
  { title: "日本の実業家", category: "経営者" },
  { title: "日本の起業家", category: "経営者" },
  { title: "日本のIT関連実業家", category: "経営者" },
  { title: "日本の投資家", category: "投資家" },
  { title: "日本の経営学者", category: "専門家" },
  { title: "日本の弁護士", category: "専門家" },
  { title: "日本の公認会計士", category: "専門家" },
  { title: "日本の不動産業界の人物", category: "経営者" },
  { title: "日本の金融業界の人物", category: "経営者" },
  { title: "日本の自動車業界の人物", category: "経営者" },
  { title: "日本の小売業界の人物", category: "経営者" },
  { title: "日本の電気電子工学者", category: "専門家" },
];

async function wikiFetchJson(params) {
  const qs = new URLSearchParams({ format: "json", ...params });
  const url = `${WIKI_API}?${qs}`;
  const res = await fetch(url, { headers: { "User-Agent": WIKI_UA } });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}: ${url}`);
  return res.json();
}

async function wikiCategoryMembers(categoryTitle, max = 500) {
  const out = [];
  let cont = null;
  while (out.length < max) {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${categoryTitle}`,
      cmtype: "page",
      cmlimit: "500",
      cmnamespace: "0",
    };
    if (cont) params.cmcontinue = cont;
    const data = await wikiFetchJson(params);
    const members = data?.query?.categorymembers ?? [];
    for (const m of members) out.push(m.title);
    cont = data?.continue?.cmcontinue;
    if (!cont) break;
    await sleep(200);
  }
  return out.slice(0, max);
}

// 50件ずつまとめて extract と pageid を取得
async function wikiExtracts(titles) {
  const result = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const data = await wikiFetchJson({
      action: "query",
      prop: "extracts|info",
      exintro: "1",
      explaintext: "1",
      exsentences: "2",
      inprop: "url",
      titles: batch.join("|"),
      redirects: "1",
    });
    const pages = data?.query?.pages ?? {};
    for (const p of Object.values(pages)) {
      if (p.missing) continue;
      result.set(p.title, {
        title: p.title,
        extract: p.extract ?? "",
        url: p.fullurl ?? `https://ja.wikipedia.org/wiki/${encodeURIComponent(p.title)}`,
      });
    }
    await sleep(300);
  }
  return result;
}

// 「○○ (実業家)」「○○ (経営者)」のような曖昧さ回避ページ名を整形
function cleanWikiName(title) {
  return title.replace(/\s*\(.*?\)\s*$/, "").trim();
}

// 抽出文から組織名らしきものを推定
function guessOrgFromExtract(extract) {
  if (!extract) return "—";
  // 「〜の代表取締役」「〜社長」「株式会社○○の」みたいなパターンを抽出
  const patterns = [
    /([\u4e00-\u9fff々ァ-ヶー\w・]+(?:株式会社|ホールディングス|グループ|コーポレーション|証券|銀行|信託|生命|損保|商事|工業))/,
    /(株式会社[\u4e00-\u9fff々ァ-ヶー\w・]+)/,
  ];
  for (const re of patterns) {
    const m = extract.match(re);
    if (m) return m[1].slice(0, 40);
  }
  return "—";
}

function guessRoleFromExtract(extract) {
  if (!extract) return "実業家";
  if (/代表取締役会長/.test(extract)) return "代表取締役会長";
  if (/代表取締役社長/.test(extract)) return "代表取締役社長";
  if (/取締役社長/.test(extract)) return "取締役社長";
  if (/会長/.test(extract)) return "会長";
  if (/社長/.test(extract)) return "社長";
  if (/CEO/.test(extract)) return "CEO";
  if (/弁護士/.test(extract)) return "弁護士";
  if (/公認会計士/.test(extract)) return "公認会計士";
  if (/教授/.test(extract)) return "教授";
  if (/投資家/.test(extract)) return "投資家";
  if (/起業家/.test(extract)) return "起業家";
  return "実業家";
}

async function scrapeWikipedia(deduper, remaining) {
  console.log(`[wikipedia] start (target +${remaining})`);
  let added = 0;
  for (const cat of WIKI_CATEGORIES) {
    if (added >= remaining) break;
    try {
      console.log(`  fetching Category:${cat.title}`);
      const titles = await wikiCategoryMembers(cat.title, 500);
      console.log(`    ${titles.length} members`);
      // フィルタ済み: まだ未登録のタイトルだけ
      const fresh = titles.filter((t) => !deduper.has(cleanWikiName(t)));
      console.log(`    ${fresh.length} new`);
      // 抽出取得（remainingに応じて切る）
      const need = Math.min(fresh.length, remaining - added);
      const extracts = await wikiExtracts(fresh.slice(0, need));
      for (const [title, info] of extracts) {
        const name = cleanWikiName(title);
        const description =
          (info.extract || "").slice(0, 240) || `Wikipedia収録の人物`;
        const person = {
          id: `wiki:${title}`.replace(/\s+/g, "_"),
          name,
          role: guessRoleFromExtract(info.extract),
          organization: guessOrgFromExtract(info.extract),
          description,
          category: cat.category,
          notableDeals: [],
          links: [{ label: "Wikipedia", url: info.url }],
        };
        if (deduper.add(person)) added++;
        if (added >= remaining) break;
      }
      await sleep(500);
    } catch (e) {
      console.warn(`  ! ${cat.title}: ${e.message}`);
    }
  }
  console.log(`[wikipedia] +${added}`);
  return added;
}

// ---- gBizINFO ----

const GBIZ_BASE = "https://api.info.gbiz.go.jp/hojin/v2/hojin";
// gBizINFO API は name パラメータ必須。よくある組織名サブストリングで検索する。
const GBIZ_NAME_QUERIES = [
  "ホールディングス",
  "株式会社",
  "コーポレーション",
  "グループ",
  "工業",
  "商事",
  "製作所",
  "電機",
  "化学",
  "建設",
  "運輸",
  "食品",
];

async function gbizFetch(path) {
  const token = process.env.GBIZ_API_TOKEN;
  if (!token) throw new Error("GBIZ_API_TOKEN missing");
  const res = await fetch(`${GBIZ_BASE}${path}`, {
    headers: { "X-hojinInfo-api-token": token },
  });
  if (res.status === 429) {
    await sleep(2000);
    return gbizFetch(path);
  }
  if (res.status === 404) return null; // 結果なし or ページ末
  if (!res.ok) throw new Error(`gBiz ${res.status}: ${path}`);
  return res.json();
}

async function scrapeGBiz(deduper, remaining) {
  console.log(`[gbiz] start (target +${remaining})`);
  let added = 0;
  // 1. list で会社一覧を集める
  const queue = []; // {corporate_number, name}
  for (const nameQuery of GBIZ_NAME_QUERIES) {
    for (let page = 1; page <= 3; page++) {
      const qs = new URLSearchParams({
        name: nameQuery,
        capital_stock_from: "100000000", // 1億円以上
        exist_flg: "true",
        limit: "100",
        page: String(page),
      });
      try {
        const data = await gbizFetch(`?${qs}`);
        if (!data) break; // 404 = no more
        const list = data?.["hojin-infos"] ?? [];
        if (list.length === 0) break;
        for (const c of list) queue.push(c);
        if (list.length < 100) break;
        await sleep(300);
      } catch (e) {
        console.warn(`  ! list "${nameQuery}" p${page}: ${e.message}`);
        break;
      }
    }
    console.log(`  "${nameQuery}": list size ${queue.length}`);
    if (queue.length >= remaining * 3) break; // 余裕をもって打ち切り
  }
  console.log(`  total list: ${queue.length} companies`);

  // 2. 各社の detail を取得して representative_name を抽出
  for (const co of queue) {
    if (added >= remaining) break;
    try {
      const data = await gbizFetch(`/${co.corporate_number}`);
      if (!data) continue;
      const detail = data?.["hojin-infos"]?.[0];
      if (!detail) continue;
      const repName = (detail.representative_name ?? "").trim();
      if (!repName) continue;
      if (deduper.has(repName)) continue;
      const person = {
        id: `gbiz:${co.corporate_number}`,
        name: repName,
        role: "代表者",
        organization: detail.name ?? co.name ?? "—",
        description: [
          detail.business_summary,
          detail.location ? `所在地: ${detail.location}` : null,
          detail.capital_stock
            ? `資本金: ${(detail.capital_stock / 1e8).toFixed(1)}億円`
            : null,
        ]
          .filter(Boolean)
          .join(" / ")
          .slice(0, 240) || `${detail.name ?? co.name} の代表者`,
        category: "経営者",
        notableDeals: [],
        links: [
          {
            label: "gBizINFO",
            url: `https://info.gbiz.go.jp/hojin/ichiran?hojinBangou=${co.corporate_number}`,
          },
          ...(detail.company_url
            ? [{ label: "公式サイト", url: detail.company_url }]
            : []),
        ],
      };
      if (deduper.add(person)) added++;
      if (added % 50 === 0) console.log(`  detail progress: +${added}`);
      await sleep(120);
    } catch {
      // 個別エラーは無視
    }
  }
  console.log(`[gbiz] +${added}`);
  return added;
}

// ---- EDINET DB ----

const EDINET_BASE = "https://edinetdb.jp/v1";

async function edinetFetch(path) {
  const key = process.env.EDINET_API_KEY;
  if (!key) throw new Error("EDINET_API_KEY missing");
  const res = await fetch(`${EDINET_BASE}${path}`, {
    headers: { "X-API-Key": key },
  });
  if (res.status === 429) {
    await sleep(2000);
    return edinetFetch(path);
  }
  if (!res.ok) throw new Error(`EDINET ${res.status}: ${path}`);
  return res.json();
}

async function scrapeEdinet(deduper, remaining) {
  console.log(`[edinet] start (target +${remaining})`);
  let added = 0;
  // 上場企業を industry でページング
  let page = 1;
  while (added < remaining && page <= 10) {
    let listResp;
    try {
      listResp = await edinetFetch(`/companies?per_page=100&page=${page}`);
    } catch (e) {
      console.warn(`  ! list page ${page}: ${e.message}`);
      break;
    }
    const companies = listResp?.data ?? [];
    if (companies.length === 0) break;
    console.log(`  page ${page}: ${companies.length} companies`);
    for (const co of companies) {
      if (added >= remaining) break;
      try {
        const offResp = await edinetFetch(`/companies/${co.edinet_code}/officers`);
        const officers = offResp?.data ?? [];
        for (const o of officers) {
          if (added >= remaining) break;
          if (!o.name) continue;
          if (deduper.has(o.name)) continue;
          const careerStr = typeof o.career === "string" ? o.career : "";
          const desc = [
            `${co.name_ja || co.name} ${o.position || "役員"}`,
            o.is_representative ? "代表" : null,
            o.is_outside ? "社外" : null,
            careerStr ? careerStr.slice(0, 180) : null,
          ]
            .filter(Boolean)
            .join(" / ")
            .slice(0, 240);
          const person = {
            id: `edinet:${co.edinet_code}:${o.name}`.replace(/\s+/g, "_"),
            name: o.name,
            role: o.position || "役員",
            organization: co.name_ja || co.name,
            description: desc,
            category: "経営者",
            notableDeals: [],
            links: [
              {
                label: "EDINET",
                url: `https://disclosure2.edinet-fsa.go.jp/WEEK0010.aspx?bm0=${co.edinet_code}`,
              },
            ],
          };
          if (deduper.add(person)) added++;
        }
        await sleep(150);
      } catch {
        // 役員データなしは多いので無視
      }
    }
    page++;
    console.log(`  cumulative +${added}`);
  }
  console.log(`[edinet] +${added}`);
  return added;
}

// ---- main ----
(async () => {
  const existing = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  console.log(`Existing: ${existing.length} entries`);
  const deduper = makeDeduper(existing);

  const initial = deduper.size();
  const remaining = () => Math.max(0, TARGET - deduper.size());

  if (SOURCES.includes("wikipedia") && remaining() > 0) {
    await scrapeWikipedia(deduper, remaining());
  }
  if (SOURCES.includes("gbiz") && remaining() > 0) {
    await scrapeGBiz(deduper, remaining());
  }
  if (SOURCES.includes("edinet") && remaining() > 0) {
    await scrapeEdinet(deduper, remaining());
  }

  const all = deduper.values();
  writeFileSync(DATA_PATH, JSON.stringify(all, null, 2) + "\n", "utf8");
  console.log(`\nDone: ${initial} → ${all.length} entries (+${all.length - initial})`);
  if (all.length < 1000) {
    console.warn("⚠ 4桁未満。TARGETを増やすか別ソースを追加してください。");
  }
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
