import "server-only";

import type { Deal } from "@/lib/deals";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for the `ma_deals` table (news-sourced M&A
 * transactions).
 *
 * Column mapping:
 *   edinet-ma     → d6e
 *   id            → (client side only, d6e uses uuid)
 *   date          → deal_date
 *   buyer         → buyer / buyer_name (populates both)
 *   target        → seller / seller_name
 *   amount        → amount (bigint, yen)
 *   currency      → currency
 *   category      → deal_category (free text)
 *   status        → deal_status  (CHECK enum)
 *   summary       → summary
 */

interface MaDealRow {
  id: string;
  deal_date: string | null;
  buyer: string;
  buyer_name: string | null;
  seller: string;
  seller_name: string | null;
  amount: string | number | null;
  currency: string | null;
  deal_category: string | null;
  deal_status: string | null;
  summary: string;
  source_url: string | null;
}

const SELECT_COLUMNS =
  "id, deal_date, buyer, buyer_name, seller, seller_name, amount, currency, deal_category, deal_status, summary, source_url";

function rowToDeal(row: MaDealRow): Deal {
  return {
    id: row.id,
    date: row.deal_date ?? "",
    buyer: row.buyer_name ?? row.buyer,
    target: row.seller_name ?? row.seller,
    amount: row.amount === null ? 0 : Number(row.amount),
    currency: row.currency ?? "JPY",
    category: row.deal_category ?? "",
    status: row.deal_status ?? "",
    summary: row.summary,
  };
}

export interface MaDealInput {
  date: string;
  buyer: string;
  target: string;
  amount: number;
  currency: string;
  category: string;
  status: string;
  summary: string;
}

// ---- Reads ----

export async function findAll(): Promise<Deal[]> {
  const result = await executeSql<MaDealRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_deals")} ORDER BY deal_date DESC NULLS LAST`,
  );
  return (result.rows ?? []).map(rowToDeal);
}

export async function findById(id: string): Promise<Deal | null> {
  const result = await executeSql<MaDealRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_deals")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToDeal(row) : null;
}

/**
 * Lookup a deal by the (buyer, target, date) composite that acts as a
 * natural key for news-sourced entries. Used by the seeder for dedup.
 */
export async function findByNaturalKey(
  buyer: string,
  target: string,
  date: string,
): Promise<Deal | null> {
  const result = await executeSql<MaDealRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_deals")}
     WHERE (buyer_name = ${escapeSqlValue(buyer)} OR buyer = ${escapeSqlValue(buyer)})
       AND (seller_name = ${escapeSqlValue(target)} OR seller = ${escapeSqlValue(target)})
       AND deal_date = ${escapeSqlValue(date)}
     LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToDeal(row) : null;
}

// ---- Writes ----
//
// This repo intentionally exposes only `create` and `remove` — not
// `update`. M&A deal rows are news-sourced snapshots that we prefer
// to replace (delete + recreate) rather than mutate in place so the
// audit trail stays clean. If a per-field update becomes necessary in
// the future, follow the pattern in `banks.ts` or `tax-advisors.ts`.

export async function create(input: MaDealInput): Promise<Deal> {
  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("ma_deals")}
       (id, deal_date, buyer, buyer_name, seller, seller_name, amount, currency, deal_category, deal_status, summary, source_type)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(input.date)},
       ${escapeSqlValue(input.buyer)},
       ${escapeSqlValue(input.buyer)},
       ${escapeSqlValue(input.target)},
       ${escapeSqlValue(input.target)},
       ${escapeSqlValue(input.amount)},
       ${escapeSqlValue(input.currency)},
       ${escapeSqlValue(input.category)},
       ${escapeSqlValue(input.status)},
       ${escapeSqlValue(input.summary)},
       'news'
     )`,
  );
  if ((result.affected_rows ?? 0) < 1) {
    throw new D6eApiError("INSERT affected 0 rows", 500, "INSERT_NO_EFFECT");
  }
  const created = await findById(id);
  if (!created) {
    throw new D6eApiError(
      "INSERT succeeded but row not found",
      500,
      "INSERT_VERIFY_FAILED",
    );
  }
  return created;
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("ma_deals")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
