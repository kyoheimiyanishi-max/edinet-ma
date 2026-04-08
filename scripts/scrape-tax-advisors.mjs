// scripts/scrape-tax-advisors.mjs
//
// 税理士・会計士DB拡張スクレイパー (gBizINFO)
// 既存 data/tax-advisors.json を保持しつつ、税理士法人・会計事務所等を追加。
//
// Usage:
//   node scripts/scrape-tax-advisors.mjs
//   TARGET=2000 node scripts/scrape-tax-advisors.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data/tax-advisors.json");
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

const TARGET = Number(process.env.TARGET ?? 1500);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeName(name) {
  return (name || "")
    .replace(/[\s\u3000]+/g, "")
    .replace(/[（）()「」『』、,。.・]/g, "")
    .toLowerCase();
}

function makeDeduper(existing) {
  const seen = new Map();
  for (const a of existing) {
    const k = normalizeName(a.name);
    if (k) seen.set(k, a);
  }
  return {
    has: (name) => seen.has(normalizeName(name)),
    add(a) {
      const k = normalizeName(a.name);
      if (!k || seen.has(k)) return false;
      seen.set(k, a);
      return true;
    },
    size: () => seen.size,
    values: () => Array.from(seen.values()),
  };
}

// ---- gBizINFO ----

const GBIZ_BASE = "https://api.info.gbiz.go.jp/hojin/v2/hojin";

// (name クエリ, 想定タイプ) のセット
const QUERIES = [
  { name: "税理士法人", type: "税理士法人" },
  { name: "会計事務所", type: "会計事務所" },
  { name: "税理士事務所", type: "税理士法人" },
  { name: "監査法人", type: "会計事務所" },
  { name: "公認会計士", type: "会計事務所" },
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
  if (!res.ok) throw new Error(`gBiz ${res.status}: ${path.slice(0, 100)}`);
  return res.json();
}

// gBizINFOの location 文字列から都道府県を抽出
function extractPrefecture(location) {
  if (!location) return undefined;
  const m = location.match(/^(.+?[都道府県])/);
  return m ? m[1] : undefined;
}

// 名前から正確なタイプを推定（クエリ由来の type をフォールバック）
function refineType(name, queryType) {
  if (/PwC|デロイト|EY|KPMG|あずさ|新日本|あらた|ＰｗＣ/.test(name)) return "Big4";
  if (/FAS|フィナンシャルアドバイザリー|ファイナンシャル[\s・]?アドバイザリー/.test(name))
    return "FAS";
  if (/M&A|エム[\s・]?アンド[\s・]?エー/.test(name)) return "M&A特化";
  if (/監査法人/.test(name)) return "会計事務所";
  if (/税理士法人/.test(name)) return "税理士法人";
  if (/会計事務所/.test(name)) return "会計事務所";
  if (/税理士事務所/.test(name)) return "税理士法人";
  if (/公認会計士/.test(name)) return "会計事務所";
  return queryType;
}

// 名前から専門分野を推定
function guessSpecialties(name) {
  const tags = new Set();
  if (/M&A|エム[\s・]?アンド[\s・]?エー/.test(name)) tags.add("M&A");
  if (/事業承継/.test(name)) tags.add("事業承継");
  if (/相続/.test(name)) tags.add("相続税務");
  if (/国際/.test(name)) tags.add("国際税務");
  if (/資産税|資産家/.test(name)) tags.add("資産税務");
  if (/医療|クリニック/.test(name)) tags.add("医療税務");
  if (/ベンチャー|スタートアップ/.test(name)) tags.add("スタートアップ支援");
  if (/不動産/.test(name)) tags.add("不動産税務");
  if (/IT|デジタル/.test(name)) tags.add("IT・テック");
  if (tags.size === 0) tags.add("法人税務");
  return Array.from(tags);
}

async function scrape() {
  const existing = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  console.log(`Existing: ${existing.length} entries`);
  const deduper = makeDeduper(existing);

  const initial = deduper.size();
  let added = 0;

  for (const q of QUERIES) {
    if (deduper.size() >= TARGET) break;
    console.log(`\n[gbiz] querying "${q.name}"`);
    let pageEmpty = 0;
    for (let page = 1; page <= 10; page++) {
      if (deduper.size() >= TARGET) break;
      const qs = new URLSearchParams({
        name: q.name,
        exist_flg: "true",
        limit: "100",
        page: String(page),
      });
      let data;
      try {
        data = await gbizFetch(`?${qs}`);
      } catch (e) {
        console.warn(`  ! p${page}: ${e.message}`);
        break;
      }
      if (!data) {
        pageEmpty++;
        if (pageEmpty >= 2) break;
        continue;
      }
      const list = data?.["hojin-infos"] ?? [];
      if (list.length === 0) break;
      pageEmpty = 0;
      let pageAdded = 0;
      for (const c of list) {
        if (!c.name) continue;
        // 過剰マッチ防止: 名前にクエリ名が含まれない場合は除外（名前ヒットを保証）
        if (!c.name.includes(q.name)) continue;
        if (deduper.has(c.name)) continue;
        const type = refineType(c.name, q.type);
        const prefecture = extractPrefecture(c.location);
        const advisor = {
          id: `gbiz:${c.corporate_number}`,
          name: c.name,
          type,
          description: [
            `${type}。`,
            c.location ? `所在地: ${c.location}` : null,
            c.postal_code ? `〒${c.postal_code}` : null,
          ]
            .filter(Boolean)
            .join(" ")
            .slice(0, 240),
          specialties: guessSpecialties(c.name),
          prefecture,
          url: `https://info.gbiz.go.jp/hojin/ichiran?hojinBangou=${c.corporate_number}`,
          notableServices: [],
        };
        if (deduper.add(advisor)) {
          added++;
          pageAdded++;
        }
        if (deduper.size() >= TARGET) break;
      }
      console.log(`  p${page}: +${pageAdded} (cumulative +${added})`);
      await sleep(300);
    }
  }

  const all = deduper.values();
  writeFileSync(DATA_PATH, JSON.stringify(all, null, 2) + "\n", "utf8");
  console.log(`\nDone: ${initial} → ${all.length} entries (+${added})`);
  if (all.length < 1000) {
    console.warn("⚠ 4桁未満。TARGETを増やすか別ソースを追加してください。");
  }
}

scrape().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
