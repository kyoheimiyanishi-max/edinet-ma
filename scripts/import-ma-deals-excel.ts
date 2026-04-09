/**
 * Import active M&A deal pipeline from `M&A案件管理表.xlsx` into the
 * d6e `sellers` table.
 *
 * Expects `/tmp/deals.json` to be pre-generated from the Excel file
 * via the openpyxl extractor (see session log). Idempotent: skips any
 * row whose company_name already exists in sellers.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env.local \
 *     scripts/import-ma-deals-excel.ts
 */

import { readFileSync } from "node:fs";
import type { MediatorType, SellerRank, SellerStage } from "../lib/sellers";
import { MEDIATOR_TYPES, SELLER_RANKS } from "../lib/sellers";
import {
  create as createSeller,
  findAll as findAllSellers,
  remove as removeSeller,
} from "../lib/d6e/repos/sellers";

interface DealRow {
  no: string | null;
  priority: string | null; // "★" or null
  rank: string | null; // "A" / "B" / "C" / "D"
  companyName: string;
  industry: string | null;
  dealType: string | null; // 仲介 / 買FA
  introSource: string | null;
  area: string | null;
  assignee: string | null;
  estimatedAmount: string | null;
  structure: string | null;
  feeEstimate: string | null;
  nda: string | null; // ○ etc
  adContract: string | null;
  status: string | null; // freeform
  nextAction: string | null;
  folderUrl: string | null;
}

function toRank(v: string | null): SellerRank | undefined {
  if (!v) return undefined;
  return (SELLER_RANKS as readonly string[]).includes(v)
    ? (v as SellerRank)
    : undefined;
}

function toMediator(v: string | null): MediatorType | undefined {
  if (!v) return undefined;
  if ((MEDIATOR_TYPES as readonly string[]).includes(v))
    return v as MediatorType;
  if (v === "仲介/FA") return "両面";
  return undefined;
}

function isFlagged(v: string | null): boolean {
  if (!v) return false;
  return /○|◯|済|有|完了/.test(v);
}

const JP_PREFECTURES = new Set([
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
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
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
]);

function normalizePrefecture(area: string | null): string | undefined {
  if (!area) return undefined;
  // "東京" → "東京都"
  if (area === "東京") return "東京都";
  if (area === "大阪") return "大阪府";
  if (area === "京都") return "京都府";
  if (area === "北海道") return "北海道";
  if (JP_PREFECTURES.has(area)) return area;
  // 海外 (シンガポール / インドネシア 等) は prefecture に入れない
  return undefined;
}

/**
 * Excel ステータス列のフリーテキストを sellers.stage enum にマッピング。
 * キーワード優先度順に判定。
 */
function mapStage(status: string | null): SellerStage {
  if (!status) return "情報収集";
  const s = status.toLowerCase();
  if (/成約|クロージング|完了/.test(status)) return "成約";
  if (/見送|ストップ|中止|却下|断念/.test(status)) return "見送り";
  if (/spa|loi|dd開始|dd実施|デューデリ|契約締結|条件交渉|交渉/.test(s)) {
    return "交渉中";
  }
  if (/打診|nda締結|ndaやり取り|ネームクリア|提示/.test(s)) return "打診中";
  if (/買い?手選定|買主開拓|アタック|アプローチ|候補|リスト化/.test(s)) {
    return "買い手選定";
  }
  if (/初回面談|面談/.test(status)) return "初回面談";
  return "情報収集";
}

function buildDescription(d: DealRow): string {
  const parts: string[] = [];
  if (d.industry) parts.push(`業種: ${d.industry}`);
  if (d.area) parts.push(`エリア: ${d.area}`);
  if (d.dealType) parts.push(`形態: ${d.dealType}`);
  if (d.assignee) parts.push(`担当: ${d.assignee}`);
  return parts.join(" / ");
}

function buildProfile(d: DealRow): string {
  const lines: string[] = [];
  if (d.priority) lines.push(`**優先度**: ${d.priority}`);
  if (d.rank) lines.push(`**ランク**: ${d.rank}`);
  if (d.introSource) lines.push(`**紹介元**: ${d.introSource}`);
  if (d.feeEstimate) lines.push(`**手数料想定**: ${d.feeEstimate}`);
  if (d.nda) lines.push(`**NDA**: ${d.nda}`);
  if (d.adContract) lines.push(`**AD契約**: ${d.adContract}`);
  if (d.status) {
    lines.push("");
    lines.push("## 現況");
    lines.push(d.status);
  }
  if (d.nextAction) {
    lines.push("");
    lines.push("## 今後のアクション");
    lines.push(d.nextAction);
  }
  return lines.join("\n");
}

function buildDesiredTerms(d: DealRow): string {
  const parts: string[] = [];
  if (d.estimatedAmount) parts.push(`想定譲渡対価: ${d.estimatedAmount}`);
  if (d.structure) parts.push(`ストラクチャー: ${d.structure}`);
  return parts.join(" / ");
}

async function main(): Promise<void> {
  const raw = readFileSync("/tmp/deals.json", "utf-8");
  const deals = JSON.parse(raw) as DealRow[];
  console.log(`📥  Loaded ${deals.length} deals from /tmp/deals.json`);

  const existing = await findAllSellers();
  const byName = new Map(existing.map((s) => [s.companyName, s.id]));
  console.log(`📊  d6e currently has ${existing.length} sellers`);

  const excelNames = new Set(deals.map((d) => d.companyName));
  // 既存の同名 seller は削除して再投入 (構造化カラムを新規挿入するため)。
  // Excel に無いものはユーザー手入力データなので残す。
  let wiped = 0;
  for (const [name, id] of byName.entries()) {
    if (excelNames.has(name)) {
      await removeSeller(id);
      wiped++;
    }
  }
  if (wiped > 0) {
    console.log(
      `🧹  wiped ${wiped} existing sellers (Excel に存在する名前のみ) — 再投入する`,
    );
  }

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const d of deals) {
    const prefecture = normalizePrefecture(d.area);
    const input = {
      companyName: d.companyName,
      industry: d.industry ?? "",
      prefecture: prefecture ?? "",
      description: buildDescription(d),
      profile: buildProfile(d),
      desiredTerms: buildDesiredTerms(d),
      stage: mapStage(d.status),
      ...(d.priority ? { priority: d.priority } : {}),
      ...((): { rank?: SellerRank } => {
        const r = toRank(d.rank);
        return r ? { rank: r } : {};
      })(),
      ...(d.assignee ? { assignedTo: d.assignee } : {}),
      ...((): { mediatorType?: MediatorType } => {
        const m = toMediator(d.dealType);
        return m ? { mediatorType: m } : {};
      })(),
      ...(d.introSource ? { introSource: d.introSource } : {}),
      ...(d.feeEstimate ? { feeEstimate: d.feeEstimate } : {}),
      ndaSigned: isFlagged(d.nda),
      adSigned: isFlagged(d.adContract),
      ...(d.folderUrl ? { folderUrl: d.folderUrl } : {}),
    };

    try {
      await createSeller(input);
      inserted++;
      console.log(
        `  ✅ ${d.companyName} [${input.stage}] ${prefecture ?? "(海外?)"} ${d.rank ?? ""} ${d.priority ?? ""}`.trim(),
      );
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ❌ ${d.companyName}: ${msg.slice(0, 200)}`);
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `inserted: ${inserted}  |  skipped (already exists): ${skipped}  |  failed: ${failed}`,
  );

  const after = await findAllSellers();
  console.log(`d6e sellers total: ${after.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
