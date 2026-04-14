/**
 * user_data 配下の全テーブルに対し、executeSql 経由で
 * SELECT COUNT(*) が成功するか (= ポリシーが設定されているか) を調べる。
 *
 * 実行:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/verify-table-policies.ts
 */
import { executeSql, D6eApiError } from "../lib/d6e/client";
import { tableRef } from "../lib/d6e/sql";
import { workspaceTablePrefix } from "../lib/d6e/config";

interface TableRow {
  table_name: string;
}

async function main() {
  const prefix = workspaceTablePrefix();
  console.log(`[policies] workspace prefix: ${prefix}`);

  // 1) 対象ワークスペースの全テーブルを情報スキーマから列挙
  const list = await executeSql<TableRow>(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'user_data'
        AND table_type = 'BASE TABLE'
        AND table_name LIKE '${prefix}%'
      ORDER BY table_name`,
  );
  const physicalNames = (list.rows ?? []).map((r) => r.table_name);
  console.log(`[policies] テーブル数: ${physicalNames.length}`);

  // 2) 各テーブルに対して SELECT COUNT(*) を試行
  const results: {
    logical: string;
    physical: string;
    status: "OK" | "POLICY_DENIED" | "OTHER";
    detail?: string;
    rows?: number;
  }[] = [];
  for (const physical of physicalNames) {
    const logical = physical.slice(prefix.length);
    try {
      const r = await executeSql<{ n: string | number }>(
        `SELECT COUNT(*) AS n FROM ${tableRef(logical)}`,
      );
      const n = Number(r.rows?.[0]?.n ?? 0);
      results.push({ logical, physical, status: "OK", rows: n });
    } catch (e) {
      if (e instanceof D6eApiError && e.code === "POLICY_DENIED") {
        results.push({ logical, physical, status: "POLICY_DENIED" });
      } else {
        results.push({
          logical,
          physical,
          status: "OTHER",
          detail: (e as Error).message,
        });
      }
    }
  }

  const ok = results.filter((r) => r.status === "OK");
  const denied = results.filter((r) => r.status === "POLICY_DENIED");
  const other = results.filter((r) => r.status === "OTHER");

  console.log(`\n✓ SELECT 可能: ${ok.length}`);
  for (const r of ok) {
    console.log(`  - ${r.logical.padEnd(30)} (行数: ${r.rows})`);
  }

  console.log(`\n❌ POLICY_DENIED: ${denied.length}`);
  for (const r of denied) {
    console.log(`  - ${r.logical}`);
  }

  if (other.length > 0) {
    console.log(`\n⚠ その他エラー: ${other.length}`);
    for (const r of other) {
      console.log(`  - ${r.logical}: ${r.detail}`);
    }
  }
}

main().catch((e) => {
  console.error("[policies] fatal:", e);
  process.exit(1);
});
