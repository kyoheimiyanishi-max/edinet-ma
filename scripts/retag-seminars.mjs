// scripts/retag-seminars.mjs
//
// 既存の data/seminars.json を内容ベースで再タグ付けする one-shot。
// title + description にキーワードマッチして tags 配列を構築。
//
// Usage: node scripts/retag-seminars.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data/seminars.json");

// タグ → マッチパターン (title+description に対する OR 集合)
// 単語境界を意識して誤マッチを避ける
const TAG_PATTERNS = {
  "M&A": [
    /(?:^|[^a-z])m&a(?:[^a-z]|$)/i,
    /エム[\s・]?アンド[\s・]?エー/,
    /合併[\s・]?買収/,
    /企業買収/,
    /M&Aアドバイザリー/i,
  ],
  事業承継: [/事業承継/, /後継者問題/, /後継者不在/, /後継者育成/],
  PMI: [
    /PMI(?:[^a-zA-Z]|$)/,
    /ポスト[\s・]?マージャー/,
    /統合[\s・]?マネジメント/,
    /post[\s-]?merger/i,
  ],
  デューデリジェンス: [
    /デューデリ/,
    /デュー[\s・]?デリジェンス/,
    /due[\s-]?diligence/i,
    /(?:^|[^a-z])DD(?:[^a-zA-Z]|$)/,
  ],
  バリュエーション: [
    /バリュエーション/,
    /企業価値評価/,
    /valuation/i,
    /株価評価/,
  ],
  "PE・ファンド": [
    /プライベート[\s・]?エクイティ/,
    /PE[\s・]?ファンド/,
    /PEファンド/,
    /バイアウト[\s・]?ファンド/,
    /投資ファンド/,
  ],
  "VC・ベンチャー投資": [
    /ベンチャー[\s・]?キャピタル/,
    /(?:^|[^a-z])VC(?:[^a-zA-Z]|$)/,
    /ベンチャー投資/,
  ],
  "IPO・上場": [
    /(?:^|[^a-z])IPO(?:[^a-zA-Z]|$)/,
    /新規上場/,
    /上場準備/,
    /株式公開/,
    /上場企業/,
  ],
  "TOB・公開買付": [
    /(?:^|[^a-z])TOB(?:[^a-zA-Z]|$)/,
    /公開買付/,
    /株式公開買付/,
  ],
  MBO: [
    /(?:^|[^a-z])MBO(?:[^a-zA-Z]|$)/,
    /マネジメント[\s・]?バイアウト/,
  ],
  カーブアウト: [/カーブアウト/, /carve[\s-]?out/i, /事業切り出し/],
  クロスボーダー: [
    /クロスボーダー/,
    /cross[\s-]?border/i,
    /海外M&A/i,
    /海外進出/,
    /海外展開/,
  ],
  スタートアップ: [
    /スタートアップ/,
    /起業家/,
    /startup/i,
    /アクセラレータ/,
    /インキュベー/,
  ],
  資金調達: [
    /資金調達/,
    /シリーズ[ABCD]/,
    /エクイティファイナンス/,
    /ベンチャーデット/,
    /出資/,
  ],
  経営戦略: [
    /経営戦略/,
    /事業戦略/,
    /成長戦略/,
    /中期経営計画/,
    /経営者[\s・]?向け/,
  ],
  ガバナンス: [
    /ガバナンス/,
    /コーポレート[\s・]?ガバナンス/,
    /取締役会/,
    /社外取締役/,
    /内部統制/,
  ],
  DX: [
    /(?:^|[^a-z])DX(?:[^a-zA-Z]|$)/,
    /デジタル[\s・]?トランスフォーメーション/,
    /デジタル変革/,
    /デジタライゼーション/,
  ],
  "財務・会計": [
    /財務分析/,
    /財務諸表/,
    /管理会計/,
    /連結会計/,
    /(?:^|[^a-z])会計(?:[^a-z]|$)/,
    /CFO(?:[^a-zA-Z]|$)/,
    /経理/,
  ],
  税務: [/税務/, /税制/, /法人税/, /租税/],
  法務: [
    /法務/,
    /契約書/,
    /契約実務/,
    /法律実務/,
    /独占禁止法/,
    /会社法/,
    /コンプライアンス/,
  ],
  "人事・組織": [
    /人事戦略/,
    /人的資本/,
    /組織開発/,
    /人材育成/,
    /タレントマネジメント/,
    /HR(?:[^a-zA-Z]|$)/,
    /リーダーシップ/,
  ],
  マーケティング: [
    /マーケティング/,
    /ブランディング/,
    /BtoB[\s・]?マーケ/,
    /広告戦略/,
  ],
};

function tagFor(text) {
  const tags = [];
  for (const [tag, patterns] of Object.entries(TAG_PATTERNS)) {
    if (patterns.some((re) => re.test(text))) tags.push(tag);
  }
  return tags;
}

// カテゴリ再判定 (タグから優先順位で1つ選ぶ。フィルター UI が単一カテゴリ表示用)
function deriveCategory(tags) {
  const priority = [
    "M&A",
    "TOB・公開買付",
    "MBO",
    "カーブアウト",
    "事業承継",
    "PMI",
    "デューデリジェンス",
    "バリュエーション",
    "PE・ファンド",
    "VC・ベンチャー投資",
    "IPO・上場",
    "クロスボーダー",
    "資金調達",
    "スタートアップ",
    "ガバナンス",
    "経営戦略",
    "DX",
    "財務・会計",
    "税務",
    "法務",
    "人事・組織",
    "マーケティング",
  ];
  for (const p of priority) {
    if (tags.includes(p)) return p;
  }
  return "その他";
}

const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
const stats = {};
let withTags = 0;
let total = data.length;
const out = [];
for (const s of data) {
  const text = `${s.title || ""} ${s.description || ""}`;
  const tags = tagFor(text);
  if (tags.length > 0) {
    withTags++;
    for (const t of tags) stats[t] = (stats[t] || 0) + 1;
    s.tags = tags;
    s.category = deriveCategory(tags);
  } else {
    s.tags = [];
    s.category = "その他";
    stats["その他"] = (stats["その他"] || 0) + 1;
  }
  out.push(s);
}

writeFileSync(DATA_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Re-tagged ${total} entries (${withTags} got ≥1 tag)`);
console.log("Tag stats:");
const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
for (const [tag, n] of sorted) console.log(`  ${tag.padEnd(20)} ${n}`);
