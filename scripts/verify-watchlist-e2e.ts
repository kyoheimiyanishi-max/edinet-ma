/**
 * user_watchlists の CRUD をエンドツーエンドで検証する。
 * ダミー行を 1 件挿入し、閲覧 / メモ更新 / 既読化 / 解除まで通す。
 * 最終的に作成した行は必ず削除する (try/finally)。
 *
 * 実行:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/verify-watchlist-e2e.ts
 */
import { executeSql } from "../lib/d6e/client";
import { tableRef, escapeSqlValue } from "../lib/d6e/sql";
import {
  addOrUpdate,
  findByUser,
  findOne,
  markSeen,
  remove,
  updateNote,
} from "../lib/d6e/repos/user-watchlists";

const TEST_EMAIL = `verify+${Date.now()}@edinet-ma.local`;

async function pickCompanyId(): Promise<string> {
  const r = await executeSql<{ id: string; name: string }>(
    `SELECT id, name FROM ${tableRef("companies")} WHERE edinet_code IS NOT NULL LIMIT 1`,
  );
  const row = r.rows?.[0];
  if (!row) throw new Error("companies テーブルに行がありません");
  console.log(`[e2e] 検証用企業: ${row.name} (${row.id})`);
  return row.id;
}

async function main() {
  const companyId = await pickCompanyId();

  try {
    // 1) INSERT
    console.log(`\n[e2e] 1) INSERT`);
    const created = await addOrUpdate({
      userEmail: TEST_EMAIL,
      companyId,
      note: "初期メモ",
    });
    console.log(`  ✓ id=${created.id} note=${created.note}`);

    // 2) idempotent INSERT (同じ組で再度 addOrUpdate → 既存更新経路)
    console.log(`\n[e2e] 2) 冪等性 (重複 INSERT → UPDATE)`);
    const again = await addOrUpdate({
      userEmail: TEST_EMAIL,
      companyId,
      note: "2回目のメモ",
    });
    if (again.id !== created.id) {
      throw new Error(
        `重複 INSERT が新しい行を作ってしまった (${again.id} ≠ ${created.id})`,
      );
    }
    console.log(`  ✓ 同一 id (${again.id}) / note="${again.note}"`);

    // 3) SELECT (単体)
    console.log(`\n[e2e] 3) findOne`);
    const found = await findOne(TEST_EMAIL, companyId);
    if (!found) throw new Error("findOne が null を返した");
    console.log(`  ✓ note="${found.note}" company="${found.company.name}"`);

    // 4) SELECT (一覧)
    console.log(`\n[e2e] 4) findByUser`);
    const list = await findByUser(TEST_EMAIL);
    if (list.length !== 1)
      throw new Error(`findByUser が ${list.length} 件返した (期待値 1)`);
    console.log(`  ✓ ${list.length} 件 / company_id=${list[0].companyId}`);

    // 5) UPDATE (note)
    console.log(`\n[e2e] 5) updateNote`);
    const okUpdate = await updateNote(TEST_EMAIL, companyId, "更新されたメモ");
    if (!okUpdate) throw new Error("updateNote が false");
    const afterUpdate = await findOne(TEST_EMAIL, companyId);
    console.log(`  ✓ note="${afterUpdate?.note}"`);

    // 6) markSeen (スナップショット更新)
    console.log(`\n[e2e] 6) markSeen`);
    await markSeen(TEST_EMAIL, companyId, {
      fiscalYear: 2025,
      revenue: 123456789,
      operatingIncome: 23456789,
      netIncome: 12345678,
      equity: 987654321,
    });
    const afterSeen = await findOne(TEST_EMAIL, companyId);
    if (afterSeen?.lastSeenFiscalYear !== 2025) {
      throw new Error(
        `lastSeenFiscalYear が反映されていない: ${afterSeen?.lastSeenFiscalYear}`,
      );
    }
    console.log(
      `  ✓ FY=${afterSeen.lastSeenFiscalYear} revenue=${afterSeen.lastSeenRevenue} last_viewed_at=${afterSeen.lastViewedAt}`,
    );
  } finally {
    // 7) DELETE (クリーンアップ)
    console.log(`\n[e2e] 7) remove (cleanup)`);
    const okDel = await remove(TEST_EMAIL, companyId);
    console.log(`  ${okDel ? "✓" : "⚠"} DELETE affected=${okDel}`);

    // 念のため残骸がないことを確認
    const leftover = await executeSql<{ n: string }>(
      `SELECT COUNT(*) AS n FROM ${tableRef("user_watchlists")}
        WHERE user_email = ${escapeSqlValue(TEST_EMAIL)}`,
    );
    const n = Number(leftover.rows?.[0]?.n ?? 0);
    console.log(`  残存行: ${n}`);
    if (n !== 0) {
      console.error("❌ クリーンアップ失敗");
      process.exit(1);
    }
  }

  console.log(`\n[e2e] ✅ 全操作成功 (INSERT / SELECT / UPDATE / DELETE)`);
}

main().catch((e) => {
  console.error("[e2e] エラー:", e);
  process.exit(1);
});
