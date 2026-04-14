/**
 * user_watchlists テーブルの存在と列定義を d6e 経由で検証する。
 *
 * 実行:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/verify-user-watchlists.ts
 */
import { executeSql } from "../lib/d6e/client";
import { workspaceTableNameValue, tableRef } from "../lib/d6e/sql";

async function main() {
  const fullName = workspaceTableNameValue("user_watchlists");
  console.log(`[verify] 対象テーブル (物理名): user_data.${fullName}`);

  // 1. information_schema で列定義を確認
  const cols = await executeSql<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'user_data'
        AND table_name = '${fullName}'
      ORDER BY ordinal_position`,
  );

  if (!cols.rows || cols.rows.length === 0) {
    console.error("[verify] ❌ テーブルが見つかりません");
    process.exit(1);
  }

  console.log(`[verify] ✓ 列 ${cols.rows.length} 件:`);
  for (const c of cols.rows) {
    console.log(
      `  - ${c.column_name.padEnd(30)} ${c.data_type.padEnd(25)} ${
        c.is_nullable === "YES" ? "NULL" : "NOT NULL"
      }${c.column_default ? `  default=${c.column_default}` : ""}`,
    );
  }

  // 2. 制約 (PK / UNIQUE / FK) の確認 — pg_* は d6e が拒否するため information_schema で代替
  const cons = await executeSql<{
    constraint_name: string;
    constraint_type: string;
  }>(
    `SELECT constraint_name, constraint_type
       FROM information_schema.table_constraints
      WHERE table_schema = 'user_data'
        AND table_name = '${fullName}'
      ORDER BY constraint_type, constraint_name`,
  );
  console.log(`\n[verify] 制約 ${cons.rows?.length ?? 0} 件:`);
  for (const c of cons.rows ?? []) {
    console.log(`  - [${c.constraint_type}] ${c.constraint_name}`);
  }

  // 3. UNIQUE / PK を構成する列を照合
  const keyCols = await executeSql<{
    constraint_name: string;
    column_name: string;
    ordinal_position: number;
  }>(
    `SELECT constraint_name, column_name, ordinal_position
       FROM information_schema.key_column_usage
      WHERE table_schema = 'user_data'
        AND table_name = '${fullName}'
      ORDER BY constraint_name, ordinal_position`,
  );
  const keyByConstraint = new Map<string, string[]>();
  for (const k of keyCols.rows ?? []) {
    const list = keyByConstraint.get(k.constraint_name) ?? [];
    list.push(k.column_name);
    keyByConstraint.set(k.constraint_name, list);
  }
  console.log(`\n[verify] 制約の構成列:`);
  for (const [name, cols] of keyByConstraint.entries()) {
    console.log(`  - ${name} → (${cols.join(", ")})`);
  }

  // 4. 実行時 SELECT (executeSql の auto-prefix 経路でアクセス可能か)
  const count = await executeSql<{ n: string | number }>(
    `SELECT COUNT(*) AS n FROM ${tableRef("user_watchlists")}`,
  );
  const n = count.rows?.[0]?.n ?? "?";
  console.log(`\n[verify] ✓ SELECT 可能 (現在の行数: ${n})`);

  // 5. 期待される列・制約が揃っているかの自動検証
  const expected = [
    "id",
    "user_email",
    "company_id",
    "note",
    "added_at",
    "last_viewed_at",
    "last_seen_fiscal_year",
    "last_seen_revenue",
    "last_seen_operating_income",
    "last_seen_net_income",
    "last_seen_equity",
    "created_at",
    "updated_at",
  ];
  const actualCols = new Set((cols.rows ?? []).map((c) => c.column_name));
  const missingCols = expected.filter((c) => !actualCols.has(c));

  const hasUnique = Array.from(keyByConstraint.entries()).some(
    ([, list]) =>
      list.length === 2 &&
      list.includes("user_email") &&
      list.includes("company_id"),
  );
  const hasPk = (cons.rows ?? []).some(
    (c) => c.constraint_type === "PRIMARY KEY",
  );
  const hasFk = (cons.rows ?? []).some(
    (c) => c.constraint_type === "FOREIGN KEY",
  );

  console.log("\n[verify] 自動判定:");
  console.log(
    `  - 期待列すべて存在: ${missingCols.length === 0 ? "✓" : `❌ 欠損=${missingCols.join(",")}`}`,
  );
  console.log(`  - PRIMARY KEY: ${hasPk ? "✓" : "❌"}`);
  console.log(`  - UNIQUE(user_email, company_id): ${hasUnique ? "✓" : "❌"}`);
  console.log(`  - FOREIGN KEY → companies: ${hasFk ? "✓" : "❌ (未設定)"}`);

  console.log("\n[verify] 完了");
}

main().catch((e) => {
  console.error("[verify] エラー:", e);
  process.exit(1);
});
