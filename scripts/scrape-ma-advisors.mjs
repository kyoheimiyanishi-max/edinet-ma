// scripts/scrape-ma-advisors.mjs
//
// M&A会社DB拡張スクレイパー (gBizINFO)
// 既存 data/ma-advisors.json を保持しつつ、M&A仲介・FA・ブティック等を追加。
//
// Usage:
//   node scripts/scrape-ma-advisors.mjs
//   TARGET=800 node scripts/scrape-ma-advisors.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data/ma-advisors.json");
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

// (name クエリ, 想定タイプ)
// 各クエリ名が法人名に含まれることを必須条件にする（精度担保）
const QUERIES = [
  { name: "M&A", type: "仲介会社" },
  { name: "エム・アンド・エー", type: "仲介会社" },
  { name: "事業承継", type: "仲介会社" },
  { name: "アドバイザリー", type: "ブティック" },
  { name: "Advisory", type: "ブティック" },
  { name: "コーポレート", type: "ブティック" },
  { name: "ファイナンシャル", type: "ブティック" },
  { name: "パートナーズ", type: "仲介会社" },
  { name: "キャピタル", type: "ブティック" },
  { name: "インベストメント", type: "ブティック" },
  { name: "ビジネスサクセッション", type: "仲介会社" },
  { name: "事業再生", type: "総合系" },
  { name: "リストラクチャリング", type: "総合系" },
  { name: "バイアウト", type: "ブティック" },
  { name: "インテグラル", type: "ブティック" },
  { name: "コンサルティング", type: "総合系" },
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

// 中小・中堅・大企業向けの粗い分類（フォールバック: 中小・中堅企業）
const REGIONAL_PREFS = new Set([
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "三重県",
  "滋賀県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
]);

function refineType(name, prefecture, queryType) {
  if (/クロスボーダー|グローバル|インターナショナル|International|Global/i.test(name))
    return "クロスボーダー";
  if (/総合研究所|総合コンサル|総合経営|フロンティア/.test(name)) return "総合系";
  if (
    /アドバイザリー|Advisory|FAS|フィナンシャル[\s・]?アドバイザリー|コーポレートアドバイザリー/i.test(
      name,
    )
  )
    return "ブティック";
  if (/M&A|エム[\s・]?アンド[\s・]?エー|事業承継|仲介|パートナーズ|キャピタル/.test(name)) {
    if (prefecture && REGIONAL_PREFS.has(prefecture)) return "地域特化";
    return "仲介会社";
  }
  return queryType;
}

function guessServices(name) {
  const services = new Set();
  if (/M&A|エム[\s・]?アンド[\s・]?エー/.test(name)) services.add("M&Aアドバイザリー");
  if (/事業承継/.test(name)) services.add("事業承継");
  if (/仲介/.test(name)) services.add("M&A仲介");
  if (/バリュエーション|株価|評価/.test(name)) services.add("バリュエーション");
  if (/PMI|統合/.test(name)) services.add("PMI支援");
  if (/再生|リストラクチャリング/.test(name)) services.add("事業再生");
  if (/コンサル/.test(name)) services.add("経営コンサル");
  if (/クロスボーダー|グローバル|インターナショナル/i.test(name))
    services.add("クロスボーダーM&A");
  if (/キャピタル|ベンチャー|PE|プライベートエクイティ/i.test(name))
    services.add("PE/ベンチャー投資");
  if (/IPO|上場/.test(name)) services.add("IPO支援");
  if (services.size === 0) services.add("M&Aアドバイザリー");
  return Array.from(services);
}

function guessTargetSize(name, type) {
  if (type === "クロスボーダー" || /グローバル|インターナショナル|International/i.test(name))
    return "中堅・大企業";
  if (type === "総合系") return "中堅・大企業";
  if (/中小|スモール/.test(name)) return "中小企業";
  return "中小・中堅企業";
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
        // クエリ名が法人名に含まれることを必須（API側の曖昧マッチ対策）
        if (!c.name.includes(q.name)) continue;
        if (deduper.has(c.name)) continue;

        // 広域クエリの場合、M&A関連キーワードでさらに絞り込み
        const isMaRelated =
          /M&A|エム[\s・]?アンド[\s・]?エー|事業承継|アドバイザリー|Advisory|FAS|仲介|バイアウト|リストラクチャリング|事業再生/i.test(
            c.name,
          ) ||
          /パートナーズ|キャピタル|インベストメント|サクセッション/i.test(c.name);
        if (!isMaRelated) continue;

        // 弁護士・税理士・会計事務所は除外（別カテゴリ）
        if (/弁護士法人|税理士法人|会計事務所|監査法人|社会保険労務士法人/.test(c.name)) continue;
        // 銀行・信金・証券・保険は除外
        if (/銀行|信用金庫|信用組合|証券|信託銀行|生命保険|損害保険/.test(c.name)) continue;
        // 不動産・建設・医療等の明らかに無関係なものを除外
        if (/不動産販売|建設|建築|病院|クリニック|薬局|学校法人|宗教法人/.test(c.name)) continue;

        const prefecture = extractPrefecture(c.location);
        const type = refineType(c.name, prefecture, q.type);
        const services = guessServices(c.name);
        const targetSize = guessTargetSize(c.name, type);

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
          services,
          prefecture,
          url: `https://info.gbiz.go.jp/hojin/ichiran?hojinBangou=${c.corporate_number}`,
          listed: false,
          targetSize,
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
}

scrape().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
