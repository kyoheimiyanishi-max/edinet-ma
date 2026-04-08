// scripts/scrape-banks.mjs
//
// 銀行・金融機関DB拡張スクレイパー (gBizINFO)
// 既存 data/banks.json を保持しつつ、銀行・信金・証券・ノンバンク等を追加。
//
// Usage:
//   node scripts/scrape-banks.mjs
//   TARGET=2000 node scripts/scrape-banks.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data/banks.json");
const ENV_PATH = join(ROOT, ".env");

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

// クエリと推定タイプの組
const QUERIES = [
  { name: "銀行", type: "地方銀行" },
  { name: "信用金庫", type: "信用金庫" },
  { name: "信用組合", type: "信用金庫" },
  { name: "証券", type: "証券会社" },
  { name: "信託", type: "信託銀行" },
  { name: "ファイナンス", type: "ノンバンク" },
  { name: "信用保証協会", type: "政策金融" },
  { name: "リース", type: "ノンバンク" },
  { name: "クレジット", type: "ノンバンク" },
  { name: "キャピタル", type: "投資銀行" },
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

function extractPrefecture(location) {
  if (!location) return undefined;
  const m = location.match(/^(.+?[都道府県])/);
  return m ? m[1] : undefined;
}

const MEGA_BANK_PATTERNS = [
  /三菱UFJ/,
  /三井住友/,
  /みずほ/,
  /りそな/,
];

function refineType(name, queryType) {
  if (MEGA_BANK_PATTERNS.some((re) => re.test(name)) && /銀行/.test(name)) return "メガバンク";
  if (/信託銀行/.test(name)) return "信託銀行";
  if (/信託/.test(name) && !/信託銀行/.test(name)) {
    // 信託会社・投資信託・受託は銘柄ごと判定
    if (/銀行/.test(name)) return "信託銀行";
  }
  if (/政策金融公庫|商工組合中央金庫|日本政策投資銀行|国際協力銀行|沖縄振興開発金融公庫|住宅金融支援機構/.test(name))
    return "政策金融";
  if (/信用保証協会/.test(name)) return "政策金融";
  if (/信用金庫/.test(name)) return "信用金庫";
  if (/信用組合/.test(name)) return "信用金庫";
  if (/(?:^|[^a-z])証券(?:[^a-z]|$)/.test(name) || /證券/.test(name)) return "証券会社";
  if (/銀行/.test(name)) return "地方銀行";
  if (/キャピタル|ベンチャー/.test(name)) return "投資銀行";
  if (/ファイナンス|リース|クレジット|信販|保証/.test(name)) return "ノンバンク";
  return queryType;
}

// 名前から M&A 関連サービスを推定
function guessMaServices(name) {
  const services = new Set();
  if (/M&A|エム[\s・]?アンド[\s・]?エー/.test(name)) services.add("M&Aアドバイザリー");
  if (/事業承継/.test(name)) services.add("事業承継支援");
  if (/キャピタル|ベンチャー/.test(name)) services.add("ベンチャー投資");
  if (/政策投資|政策金融|商工組合/.test(name)) services.add("政策金融支援");
  if (/信託/.test(name)) services.add("信託業務");
  if (/リース/.test(name)) services.add("リースファイナンス");
  if (/クレジット|信販/.test(name)) services.add("クレジット業務");
  if (services.size === 0) services.add("融資・与信");
  return Array.from(services);
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
        if (!c.name.includes(q.name)) continue;
        if (deduper.has(c.name)) continue;
        const type = refineType(c.name, q.type);
        const prefecture = extractPrefecture(c.location);
        const bank = {
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
          maServices: guessMaServices(c.name),
          prefecture,
          url: `https://info.gbiz.go.jp/hojin/ichiran?hojinBangou=${c.corporate_number}`,
        };
        if (deduper.add(bank)) {
          added++;
          pageAdded++;
        }
        if (deduper.size() >= TARGET) break;
      }
      console.log(`  p${page}: +${pageAdded} (cumulative +${added})`);
      await sleep(280);
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
