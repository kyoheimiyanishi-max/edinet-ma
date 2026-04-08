// scripts/scrape-financial-planners.mjs
//
// Financial Planner DB拡張スクレイパー (gBizINFO)
// 既存 data/financial-planners.json を保持しつつ、独立系FP・IFA・PB等を追加。
//
// Usage:
//   node scripts/scrape-financial-planners.mjs
//   TARGET=800 node scripts/scrape-financial-planners.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data/financial-planners.json");
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

const TARGET = Number(process.env.TARGET ?? 500);

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

const QUERIES = [
  { name: "ファイナンシャルプランナー", type: "独立系FP" },
  { name: "ファイナンシャル・プランニング", type: "独立系FP" },
  { name: "ファイナンシャルプランニング", type: "独立系FP" },
  { name: "FP", type: "独立系FP" },
  { name: "投資顧問", type: "IFA" },
  { name: "資産運用", type: "IFA" },
  { name: "ウェルスマネジメント", type: "IFA" },
  { name: "ウェルス", type: "IFA" },
  { name: "プライベートバンキング", type: "銀行系FP" },
  { name: "ライフプラン", type: "保険系FP" },
  { name: "アセットマネジメント", type: "IFA" },
  { name: "プランナーズ", type: "独立系FP" },
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

function refineType(name, queryType) {
  if (/プライベートバンキング|プライベート・バンキング|Private Banking/i.test(name))
    return "銀行系FP";
  if (/ロボアド|robo|ロボアドバイザー/i.test(name)) return "ロボアド";
  if (/IFA|Independent Financial/i.test(name)) return "IFA";
  if (/投資顧問|アセットマネジメント|資産運用|ウェルス|Wealth|キャピタル/i.test(name))
    return "IFA";
  if (/保険|生命|損害|ライフプラン/.test(name)) return "保険系FP";
  if (/銀行|信託|証券/.test(name)) return "銀行系FP";
  if (/事務所/.test(name)) return "FP事務所";
  if (/ファイナンシャルプランナー|ファイナンシャル[\s・]?プランニング|FP|Financial Plan/i.test(name))
    return "独立系FP";
  return queryType;
}

function guessServices(name) {
  const services = new Set();
  if (/資産運用|アセット|ウェルス|Wealth|アセットマネジメント/i.test(name))
    services.add("資産運用");
  if (/相続|遺言/.test(name)) services.add("相続対策");
  if (/事業承継/.test(name)) services.add("事業承継相談");
  if (/保険|生命|損害|ライフプラン/.test(name)) services.add("保険見直し");
  if (/住宅|不動産|ローン/.test(name)) services.add("住宅ローン相談");
  if (/年金|リタイア/.test(name)) services.add("年金・リタイアメント");
  if (/教育/.test(name)) services.add("教育資金");
  if (/投資顧問|投信|ファンド/.test(name)) services.add("投資助言");
  if (/IFA|Independent/i.test(name)) services.add("IFA資産運用");
  if (/プライベートバンキング/i.test(name)) services.add("プライベートバンキング");
  if (/ロボアド/i.test(name)) services.add("ロボアドバイザー");
  if (services.size === 0) services.add("ライフプラン相談");
  return Array.from(services);
}

function guessTargetClients(name, type) {
  if (/プライベートバンキング|富裕層|Wealth|ウェルス/i.test(name)) return "富裕層・経営者";
  if (type === "銀行系FP") return "富裕層・経営者";
  if (/法人|企業/.test(name)) return "法人・経営者";
  if (/個人/.test(name)) return "個人・ファミリー層";
  return "個人・ファミリー層";
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
    for (let page = 1; page <= 8; page++) {
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
        if (deduper.has(c.name)) continue;

        // FP関連キーワードを含むものに絞る
        if (
          !/ファイナンシャルプランナー|ファイナンシャル[\s・]?プランニング|FP|Financial|資産運用|投資顧問|ウェルス|Wealth|アセットマネジメント|プライベートバンキング|ライフプラン|プランナー/i.test(
            c.name,
          )
        )
          continue;
        // 銀行・信金・証券・保険会社本体は除外（=独自カテゴリで扱う方が綺麗）
        if (/銀行$|信用金庫|信用組合|証券株式会社|生命保険株式会社|損害保険株式会社/.test(c.name))
          continue;
        // 法律系・会計系は除外
        if (/弁護士法人|税理士法人|会計事務所|監査法人/.test(c.name)) continue;
        // 不動産・建設系の汎用ヒットを除外
        if (/建設|建築|不動産販売|住宅販売/.test(c.name)) continue;

        const type = refineType(c.name, q.type);
        const prefecture = extractPrefecture(c.location);
        const services = guessServices(c.name);
        const targetClients = guessTargetClients(c.name, type);

        const planner = {
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
          services,
          targetClients,
          prefecture,
          url: `https://info.gbiz.go.jp/hojin/ichiran?hojinBangou=${c.corporate_number}`,
          listed: false,
        };
        if (deduper.add(planner)) {
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
}

scrape().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
