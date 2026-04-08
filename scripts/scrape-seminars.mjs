// scripts/scrape-seminars.mjs
//
// セミナーDB拡張スクレイパー（Doorkeeper API）
// 月別ウィンドウでDoorkeeperを巡回し、過去〜未来のイベントを収集する。
//
// Usage:
//   node scripts/scrape-seminars.mjs
//   TARGET=1500 SINCE=2020-01 node scripts/scrape-seminars.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data/seminars.json");

const TARGET = Number(process.env.TARGET ?? 1200);
const SINCE = process.env.SINCE ?? "2020-01"; // YYYY-MM
const UNTIL = process.env.UNTIL ?? null; // optional YYYY-MM

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Doorkeeper API ----

const DK_BASE = "https://api.doorkeeper.jp/events";
const UA = "edinet-ma-seminars-scraper/0.1 (research/internal use)";

async function dkFetch(qs) {
  const res = await fetch(`${DK_BASE}?${qs}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (res.status === 429) {
    await sleep(3000);
    return dkFetch(qs);
  }
  if (!res.ok) throw new Error(`Doorkeeper ${res.status}`);
  return res.json();
}

// 月単位で since/until を作成
function* monthWindows(startYM, endYM) {
  const [sy, sm] = startYM.split("-").map(Number);
  const end = endYM ? endYM.split("-").map(Number) : null;
  let y = sy;
  let m = sm;
  while (true) {
    const since = `${y}-${String(m).padStart(2, "0")}-01`;
    let ny = y;
    let nm = m + 1;
    if (nm > 12) {
      ny++;
      nm = 1;
    }
    const until = `${ny}-${String(nm).padStart(2, "0")}-01`;
    yield { since, until };
    if (end && (ny > end[0] || (ny === end[0] && nm > end[1]))) break;
    y = ny;
    m = nm;
    if (y > 2030) break; // safety
  }
}

// ---- HTML strip & category guess ----

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[\s\u3000]+/g, " ")
    .trim();
}

function guessCategory(text) {
  // 厳密な単語境界マッチ（部分文字列でM&A誤判定を防ぐ）
  if (/(?:^|[^a-z])m&a(?:[^a-z]|$)/i.test(text) || /エム[\s・]?アンド[\s・]?エー|企業買収|敵対的買収|TOB(?:[^a-zA-Z]|$)/.test(text))
    return "M&A";
  if (/事業承継|後継者(?:不在|問題|育成)/.test(text)) return "事業承継";
  if (/PMI(?:[^a-zA-Z]|$)|ポスト[\s・]?マージャー/.test(text)) return "PMI";
  if (/デューデリ|デュー[\s・]?デリジェンス|due[\s-]?diligence/i.test(text))
    return "デューデリジェンス";
  if (/バリュエーション|企業価値評価|valuation/i.test(text))
    return "バリュエーション";
  if (/プライベート[\s・]?エクイティ|PE[\s・]?ファンド|ベンチャー[\s・]?キャピタル|VC[\s・]?投資/.test(text))
    return "PE・ファンド";
  if (/IPO(?:[^a-zA-Z]|$)|新規上場|上場準備|株式公開/.test(text)) return "IPO・上場";
  if (/スタートアップ|起業家|資金調達|シリーズ[ABCD]ラウンド/.test(text))
    return "スタートアップ";
  if (/(?:DX|デジタル[\s・]?トランスフォーメーション)(?:[^a-zA-Z]|$)|経営戦略|リーダーシップ/.test(text))
    return "DX・経営";
  if (/経営者(?:向け|セミナー|交流)|社長[\s・]?CXO|CEO[\s・]|CFO[\s・]/.test(text))
    return "経営者向け";
  return "その他";
}

// 厳格なフィルタ: 中核キーワードを含むもののみ採用
function isRelevant(title, description) {
  const text = `${title} ${description}`;
  // テスト系・スポーツ系・趣味系を除外
  if (/テスト|test|アラートなし|ボードゲーム|ゲームサークル|管理獲得|ネットワーキング|オフィスアワー/i.test(text))
    return false;
  // 中核キーワード（M&A/経営/事業承継系）
  const must = [
    /(?:^|[^a-z])m&a(?:[^a-z]|$)/i,
    /企業買収|敵対的買収|TOB/,
    /事業承継|後継者/,
    /PMI(?:[^a-zA-Z]|$)/,
    /デューデリ/,
    /バリュエーション|企業価値/,
    /プライベート[\s・]?エクイティ|PE[\s・]?ファンド|ベンチャー[\s・]?キャピタル/,
    /IPO(?:[^a-zA-Z]|$)|新規上場|上場準備/,
    /スタートアップ|起業|資金調達/,
    /経営戦略|経営者[\s・]?向け|社長/,
    /財務|会計|税務|ガバナンス/,
    /M&Aアドバイザリー|FA[\s・]?業務/,
    /カーブアウト|MBO|EBO/,
    /DX(?:[^a-zA-Z]|$)|デジタル変革/,
  ];
  return must.some((re) => re.test(text));
}

// テスト用イベントを排除する Doorkeeper グループ ID / URL
const BANNED_URL_FRAGMENTS = ["majisemi-technology"];

function mapEvent(raw) {
  const e = raw.event;
  if (!e || !e.id) return null;
  const url = e.public_url || `https://www.doorkeeper.jp/events/${e.id}`;
  if (BANNED_URL_FRAGMENTS.some((f) => url.includes(f))) return null;
  const description = stripHtml(e.description || "");
  const catchText = description.slice(0, 140);
  const category = guessCategory(`${e.title || ""} ${description}`);
  return {
    event_id: e.id,
    title: e.title || "",
    catch: catchText,
    description: description.slice(0, 800),
    event_url: e.public_url || `https://www.doorkeeper.jp/events/${e.id}`,
    started_at: e.starts_at || "",
    ended_at: e.ends_at || "",
    place: e.venue_name || "",
    address: e.address || "",
    owner_display_name: e.group ? `Doorkeeper Group #${e.group}` : "",
    accepted: 0,
    limit: null,
    event_type: "",
    category,
  };
}

async function scrape() {
  const existing = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const seenIds = new Set(existing.map((s) => s.event_id));
  const out = [...existing];
  console.log(`Existing: ${existing.length}`);

  // 現在月までのウィンドウを生成（先頭から）
  const now = new Date();
  const endYM =
    UNTIL ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const windows = Array.from(monthWindows(SINCE, endYM));
  // 新しい月を優先（新規順）
  windows.reverse();
  console.log(`${windows.length} monthly windows from ${SINCE} → ${endYM}`);

  let added = 0;
  let dropped = 0;

  for (const { since, until } of windows) {
    if (out.length >= TARGET) break;
    let pageEmpty = 0;
    for (let page = 1; page <= 20; page++) {
      if (out.length >= TARGET) break;
      const qs = new URLSearchParams({
        locale: "ja",
        sort: "starts_at",
        since,
        until,
        page: String(page),
      });
      let data;
      try {
        data = await dkFetch(qs.toString());
      } catch (e) {
        console.warn(`  ! ${since} p${page}: ${e.message}`);
        await sleep(1000);
        break;
      }
      if (!Array.isArray(data) || data.length === 0) {
        pageEmpty++;
        if (pageEmpty >= 2) break; // stop after 2 consecutive empty pages
        continue;
      }
      pageEmpty = 0;
      for (const raw of data) {
        const ev = mapEvent(raw);
        if (!ev) continue;
        if (seenIds.has(ev.event_id)) continue;
        if (!isRelevant(ev.title, ev.description)) {
          dropped++;
          continue;
        }
        seenIds.add(ev.event_id);
        out.push(ev);
        added++;
        if (out.length >= TARGET) break;
      }
      await sleep(220); // ~5 req/sec
    }
    if (added % 100 < 25 && added > 0) {
      console.log(`  ${since}: cumulative +${added} (dropped ${dropped})`);
    }
  }

  writeFileSync(DATA_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(
    `\nDone: ${existing.length} → ${out.length} entries (+${added}, ${dropped} non-relevant skipped)`,
  );
  if (out.length < 1000) {
    console.warn("⚠ 4桁未満。SINCEを早めるか TARGET を上げてください。");
  }
}

scrape().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
