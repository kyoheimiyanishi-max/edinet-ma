/**
 * ノンネーム資料生成の動作確認用シードスクリプト。
 *
 * テスト seller (アクアテック・ソリューションズ株式会社) に対して、
 * ノンネーム資料の構成要素が揃う最小セットを上書き投入する。
 * 既存プロファイルを破壊しないよう、まず現状を表示 → 確認プロンプト
 * → 実行の順で進む (--apply で即時実行)。
 *
 * 使い方:
 *   pnpm exec tsx --conditions=react-server --env-file=.env.local \
 *     scripts/seed-nonname-test-seller.ts [--apply]
 */

import { executeSql } from "../lib/d6e/client";
import { escapeSqlValue, tableRef } from "../lib/d6e/sql";

const SELLER_ID = "a1f2c3d4-0003-4a10-9f11-000000000003";

const patch = {
  revenue_range: "5〜10億円",
  operating_profit_range: "5,000万〜1億円",
  employee_range: "30〜50名",
  founded_year: 2008,
  sale_reason: "後継者不在・事業承継",
  strengths:
    "上場メーカー向け直接取引\n独自のクリーン浄水技術\n継続率 95%以上の顧客基盤",
  desired_terms: "従業員の雇用継続を最優先",
  target_price: "5〜10億円",
  sale_schedule: "2026年上期",
  mediator_type: "FA",
};

async function main() {
  const apply = process.argv.includes("--apply");

  const before = await executeSql<Record<string, unknown>>(
    `SELECT id, company_name, industry, prefecture,
            revenue_range, operating_profit_range, employee_range,
            founded_year, sale_reason, strengths,
            desired_terms, target_price, sale_schedule, mediator_type
     FROM ${tableRef("sellers")}
     WHERE id = ${escapeSqlValue(SELLER_ID)}`,
  );
  const current = (before.rows ?? [])[0];
  if (!current) {
    console.error(`[ERROR] seller not found: ${SELLER_ID}`);
    process.exit(2);
  }

  console.log("\n=== current ===");
  console.log(JSON.stringify(current, null, 2));
  console.log("\n=== patch ===");
  console.log(JSON.stringify(patch, null, 2));

  if (!apply) {
    console.log("\n[dry-run] re-run with --apply to write.");
    return;
  }

  const assignments = Object.entries(patch).map(([k, v]) => {
    if (typeof v === "number") {
      return `${k} = ${escapeSqlValue(v)}`;
    }
    return `${k} = ${escapeSqlValue(v)}`;
  });
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("sellers")}
     SET ${assignments.join(", ")}
     WHERE id = ${escapeSqlValue(SELLER_ID)}`,
  );
  console.log(`[OK] updated (affected_rows=${result.affected_rows ?? 0})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
