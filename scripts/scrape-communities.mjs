// scripts/scrape-communities.mjs
//
// コミュニティDB拡張スクレイパー（Wikipedia / gBizINFO）
// 既存 data/communities.json を保持しつつ追加。
//
// Usage:
//   node scripts/scrape-communities.mjs
//   SOURCES=wikipedia,gbiz TARGET=1500 node scripts/scrape-communities.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data/communities.json");
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null) process.env[k] = v;
  }
}
loadEnv();

const SOURCES = (process.env.SOURCES ?? "wikipedia,gbiz")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const TARGET = Number(process.env.TARGET ?? 1100);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeName(name) {
  return (name || "")
    .replace(/[\s\u3000]+/g, "")
    .replace(/[（）()「」『』、,。.・]/g, "")
    .toLowerCase();
}

function makeDeduper(existing) {
  const seen = new Map();
  for (const c of existing) {
    const k = normalizeName(c.name);
    if (k) seen.set(k, c);
  }
  return {
    has: (name) => seen.has(normalizeName(name)),
    add(c) {
      const k = normalizeName(c.name);
      if (!k || seen.has(k)) return false;
      seen.set(k, c);
      return true;
    },
    size: () => seen.size,
    values: () => Array.from(seen.values()),
  };
}

// ---- Wikipedia ----

const WIKI_API = "https://ja.wikipedia.org/w/api.php";
const WIKI_UA = "edinet-ma-communities-scraper/0.1 (research/internal use)";

// Wikipedia カテゴリ → CommunityType
const WIKI_CATEGORIES = [
  // 経済団体・経営者団体
  { title: "日本の経済団体", type: "経営者団体" },
  { title: "日本の業界団体", type: "業界団体" },
  { title: "日本の経営者団体", type: "経営者団体" },
  { title: "日本の商工会議所", type: "経営者団体" },
  { title: "日本の協同組合", type: "経営者団体" },
  { title: "日本の事業者団体", type: "業界団体" },
  // 業界別 (業界団体)
  { title: "日本の自動車業界の組織", type: "業界団体" },
  { title: "日本の食品業界の組織", type: "業界団体" },
  { title: "日本の電機業界の組織", type: "業界団体" },
  { title: "日本の鉄鋼業界の組織", type: "業界団体" },
  { title: "日本の化学業界の組織", type: "業界団体" },
  { title: "日本の建設業界の組織", type: "業界団体" },
  { title: "日本の金融業界の組織", type: "業界団体" },
  { title: "日本の運輸業界の組織", type: "業界団体" },
  { title: "日本のIT業界の組織", type: "業界団体" },
  { title: "日本の小売業界の組織", type: "業界団体" },
  { title: "日本のサービス業界の組織", type: "業界団体" },
  // 学会・アカデミア
  { title: "日本の学会", type: "アカデミア" },
  { title: "日本の経営学会", type: "アカデミア" },
  // 士業
  { title: "日本の弁護士団体", type: "士業ネットワーク" },
  { title: "日本の公認会計士団体", type: "士業ネットワーク" },
  { title: "日本の税理士団体", type: "士業ネットワーク" },
];

async function wikiFetchJson(params) {
  const qs = new URLSearchParams({ format: "json", ...params });
  const res = await fetch(`${WIKI_API}?${qs}`, { headers: { "User-Agent": WIKI_UA } });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json();
}

// 再帰的にカテゴリツリーを辿る (subcat も対象)
async function wikiCategoryMembersRecursive(categoryTitle, max = 1500, depth = 0, visited = new Set()) {
  if (depth > 3 || visited.has(categoryTitle)) return [];
  visited.add(categoryTitle);
  const out = [];
  let cont = null;
  while (out.length < max) {
    const params = {
      action: "query",
      list: "categorymembers",
      cmtitle: `Category:${categoryTitle}`,
      cmtype: "page|subcat",
      cmlimit: "500",
      cmnamespace: "0|14",
    };
    if (cont) params.cmcontinue = cont;
    let data;
    try {
      data = await wikiFetchJson(params);
    } catch {
      break;
    }
    const members = data?.query?.categorymembers ?? [];
    for (const m of members) {
      if (m.ns === 14) {
        // subcategory
        const subTitle = m.title.replace(/^Category:/, "");
        const subPages = await wikiCategoryMembersRecursive(subTitle, max - out.length, depth + 1, visited);
        for (const t of subPages) out.push(t);
        if (out.length >= max) break;
      } else {
        out.push(m.title);
        if (out.length >= max) break;
      }
    }
    cont = data?.continue?.cmcontinue;
    if (!cont) break;
    await sleep(200);
  }
  return out.slice(0, max);
}

async function wikiExtracts(titles) {
  const result = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    let data;
    try {
      data = await wikiFetchJson({
        action: "query",
        prop: "extracts|info",
        exintro: "1",
        explaintext: "1",
        exsentences: "3",
        inprop: "url",
        titles: batch.join("|"),
        redirects: "1",
      });
    } catch {
      continue;
    }
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

function cleanWikiTitle(title) {
  return title.replace(/\s*\(.*?\)\s*$/, "").trim();
}

function guessFocusAreas(extract, type) {
  const areas = new Set();
  const map = {
    "M&A": "M&A",
    "事業承継": "事業承継",
    "経営": "経営",
    "ガバナンス": "ガバナンス",
    "起業": "起業",
    "投資": "投資",
    "IT": "IT",
    "DX": "DX",
    "海外": "グローバル",
    "国際": "グローバル",
    "中小企業": "中小企業",
    "金融": "金融",
    "テクノロジー": "テクノロジー",
    "イノベーション": "イノベーション",
  };
  for (const [k, v] of Object.entries(map)) {
    if (extract.includes(k)) areas.add(v);
  }
  if (areas.size === 0) areas.add(type);
  return Array.from(areas);
}

function guessPrefecture(extract) {
  const prefs = [
    "北海道", "青森", "岩手", "宮城", "秋田", "山形", "福島",
    "茨城", "栃木", "群馬", "埼玉", "千葉", "東京", "神奈川",
    "新潟", "富山", "石川", "福井", "山梨", "長野", "岐阜",
    "静岡", "愛知", "三重", "滋賀", "京都", "大阪", "兵庫",
    "奈良", "和歌山", "鳥取", "島根", "岡山", "広島", "山口",
    "徳島", "香川", "愛媛", "高知", "福岡", "佐賀", "長崎",
    "熊本", "大分", "宮崎", "鹿児島", "沖縄",
  ];
  for (const p of prefs) {
    if (extract.includes(p)) {
      return p === "北海道" ? "北海道" : p === "東京" ? "東京都" : p === "京都" ? "京都府" : p === "大阪" ? "大阪府" : `${p}県`;
    }
  }
  return undefined;
}

function guessYear(extract) {
  const m = extract.match(/(\d{4})年/);
  if (!m) return undefined;
  const y = Number(m[1]);
  if (y >= 1800 && y <= new Date().getFullYear()) return y;
  return undefined;
}

async function scrapeWikipedia(deduper, remaining) {
  console.log(`[wikipedia] start (target +${remaining})`);
  let added = 0;
  for (const cat of WIKI_CATEGORIES) {
    if (added >= remaining) break;
    try {
      console.log(`  Category:${cat.title}`);
      const titles = await wikiCategoryMembersRecursive(cat.title, 500);
      const fresh = Array.from(new Set(titles)).filter(
        (t) => !deduper.has(cleanWikiTitle(t)),
      );
      console.log(`    ${titles.length} found / ${fresh.length} new`);
      if (fresh.length === 0) continue;
      const need = Math.min(fresh.length, remaining - added);
      const extracts = await wikiExtracts(fresh.slice(0, need));
      for (const [title, info] of extracts) {
        const name = cleanWikiTitle(title);
        const description = (info.extract || "").slice(0, 280) || `Wikipedia収録の${cat.type}`;
        const community = {
          id: `wiki:${title}`.replace(/\s+/g, "_"),
          name,
          description,
          url: info.url,
          prefecture: guessPrefecture(info.extract),
          type: cat.type,
          focusAreas: guessFocusAreas(info.extract, cat.type),
          established: guessYear(info.extract),
        };
        if (deduper.add(community)) added++;
        if (added >= remaining) break;
      }
      console.log(`    cumulative +${added}`);
      await sleep(400);
    } catch (e) {
      console.warn(`  ! ${cat.title}: ${e.message}`);
    }
  }
  console.log(`[wikipedia] +${added}`);
  return added;
}

// ---- gBizINFO ----

const GBIZ_BASE = "https://api.info.gbiz.go.jp/hojin/v2/hojin";

// 団体・組合系の名称サブストリング (団体らしいもの)
const GBIZ_NAME_QUERIES = [
  { name: "商工会議所", type: "経営者団体" },
  { name: "工業会", type: "業界団体" },
  { name: "業界団体", type: "業界団体" },
  { name: "工業協会", type: "業界団体" },
  { name: "事業協同組合", type: "経営者団体" },
  { name: "協同組合", type: "経営者団体" },
  { name: "経営者協会", type: "経営者団体" },
  { name: "同友会", type: "経営者団体" },
  { name: "経済同友会", type: "経営者団体" },
  { name: "連合会", type: "業界団体" },
  { name: "工業協同組合", type: "業界団体" },
  { name: "商店街振興組合", type: "経営者団体" },
  { name: "中央会", type: "経営者団体" },
  { name: "業協会", type: "業界団体" },
  { name: "技術協会", type: "業界団体" },
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
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`gBiz ${res.status}: ${path}`);
  return res.json();
}

async function scrapeGBiz(deduper, remaining) {
  console.log(`[gbiz] start (target +${remaining})`);
  let added = 0;
  // list で会社一覧を集める
  const queue = []; // {co, type}
  for (const q of GBIZ_NAME_QUERIES) {
    if (queue.length >= remaining * 2) break;
    for (let page = 1; page <= 5; page++) {
      const qs = new URLSearchParams({
        name: q.name,
        exist_flg: "true",
        limit: "100",
        page: String(page),
      });
      try {
        const data = await gbizFetch(`?${qs}`);
        if (!data) break;
        const list = data?.["hojin-infos"] ?? [];
        if (list.length === 0) break;
        for (const c of list) {
          // 過剰マッチ防止: 名前に名称サブストリングを含むもののみ
          if (!c.name?.includes(q.name)) continue;
          queue.push({ co: c, type: q.type });
        }
        if (list.length < 100) break;
        await sleep(300);
      } catch (e) {
        console.warn(`  ! list ${q.name} p${page}: ${e.message}`);
        break;
      }
    }
    console.log(`  "${q.name}": list size ${queue.length}`);
  }
  console.log(`  total list: ${queue.length}`);

  // detail を取らずに、name + 所在地ベースで登録（高速化）
  for (const { co, type } of queue) {
    if (added >= remaining) break;
    const name = co.name;
    if (!name) continue;
    if (deduper.has(name)) continue;
    // 都道府県を location から抽出
    let prefecture;
    if (typeof co.location === "string") {
      const m = co.location.match(/^(.+?[都道府県])/);
      if (m) prefecture = m[1];
    }
    const community = {
      id: `gbiz:${co.corporate_number}`,
      name,
      description: `${type}。所在地: ${co.location ?? "—"}${co.postal_code ? ` (〒${co.postal_code})` : ""}`,
      url: `https://info.gbiz.go.jp/hojin/ichiran?hojinBangou=${co.corporate_number}`,
      prefecture,
      type,
      focusAreas: [type],
    };
    if (deduper.add(community)) added++;
  }
  console.log(`[gbiz] +${added}`);
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
