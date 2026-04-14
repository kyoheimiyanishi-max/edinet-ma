import "server-only";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for the `user_watchlists` table.
 *
 * ユーザー (email キー) が「ウォッチ」している企業と、次回閲覧時の
 * 「新着」判定に使う財務スナップショットを保持する。
 *
 * - UNIQUE(user_email, company_id) により同一ユーザーの重複追加は不可
 * - `last_seen_*` 列は一覧を閲覧した直後に更新する想定
 * - d6e-api は DDL 禁止なので、テーブルは scripts/migrations/001_*.sql
 *   で d6e 運営に作成依頼する
 */

export interface WatchlistEntry {
  id: string;
  userEmail: string;
  companyId: string;
  note?: string;
  addedAt: string;
  lastViewedAt?: string;
  lastSeenFiscalYear?: number;
  lastSeenRevenue?: number;
  lastSeenOperatingIncome?: number;
  lastSeenNetIncome?: number;
  lastSeenEquity?: number;
  createdAt: string;
  updatedAt: string;
  // company 側の表示用メタ (JOIN で取得)
  company: {
    id: string;
    name: string;
    corporateNumber?: string;
    edinetCode?: string;
    secCode?: string;
    industry?: string;
    listingStatus?: string;
    address?: string;
  };
}

interface Row {
  id: string;
  user_email: string;
  company_id: string;
  note: string | null;
  added_at: string;
  last_viewed_at: string | null;
  last_seen_fiscal_year: number | null;
  last_seen_revenue: string | number | null;
  last_seen_operating_income: string | number | null;
  last_seen_net_income: string | number | null;
  last_seen_equity: string | number | null;
  created_at: string;
  updated_at: string;
  company_name: string;
  company_corporate_number: string | null;
  company_edinet_code: string | null;
  company_sec_code: string | null;
  company_industry: string | null;
  company_listing_status: string | null;
  company_address: string | null;
}

const SELECT_JOIN = `
  w.id, w.user_email, w.company_id, w.note, w.added_at, w.last_viewed_at,
  w.last_seen_fiscal_year, w.last_seen_revenue, w.last_seen_operating_income,
  w.last_seen_net_income, w.last_seen_equity,
  w.created_at, w.updated_at,
  c.name AS company_name,
  c.corporate_number AS company_corporate_number,
  c.edinet_code AS company_edinet_code,
  c.sec_code AS company_sec_code,
  c.industry AS company_industry,
  c.listing_status AS company_listing_status,
  c.address AS company_address
`;

function numOrUndef(v: string | number | null): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function rowToEntry(row: Row): WatchlistEntry {
  return {
    id: row.id,
    userEmail: row.user_email,
    companyId: row.company_id,
    ...(row.note ? { note: row.note } : {}),
    addedAt: row.added_at,
    ...(row.last_viewed_at ? { lastViewedAt: row.last_viewed_at } : {}),
    ...(row.last_seen_fiscal_year != null
      ? { lastSeenFiscalYear: row.last_seen_fiscal_year }
      : {}),
    ...((): Partial<WatchlistEntry> => {
      const r = numOrUndef(row.last_seen_revenue);
      return r !== undefined ? { lastSeenRevenue: r } : {};
    })(),
    ...((): Partial<WatchlistEntry> => {
      const v = numOrUndef(row.last_seen_operating_income);
      return v !== undefined ? { lastSeenOperatingIncome: v } : {};
    })(),
    ...((): Partial<WatchlistEntry> => {
      const v = numOrUndef(row.last_seen_net_income);
      return v !== undefined ? { lastSeenNetIncome: v } : {};
    })(),
    ...((): Partial<WatchlistEntry> => {
      const v = numOrUndef(row.last_seen_equity);
      return v !== undefined ? { lastSeenEquity: v } : {};
    })(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    company: {
      id: row.company_id,
      name: row.company_name,
      ...(row.company_corporate_number
        ? { corporateNumber: row.company_corporate_number }
        : {}),
      ...(row.company_edinet_code
        ? { edinetCode: row.company_edinet_code }
        : {}),
      ...(row.company_sec_code ? { secCode: row.company_sec_code } : {}),
      ...(row.company_industry ? { industry: row.company_industry } : {}),
      ...(row.company_listing_status
        ? { listingStatus: row.company_listing_status }
        : {}),
      ...(row.company_address ? { address: row.company_address } : {}),
    },
  };
}

// ---- Reads ----

export async function findByUser(userEmail: string): Promise<WatchlistEntry[]> {
  const result = await executeSql<Row>(
    `SELECT ${SELECT_JOIN}
       FROM ${tableRef("user_watchlists")} w
       JOIN ${tableRef("companies")} c ON c.id = w.company_id
      WHERE w.user_email = ${escapeSqlValue(userEmail)}
      ORDER BY w.added_at DESC`,
  );
  return (result.rows ?? []).map(rowToEntry);
}

export async function findOne(
  userEmail: string,
  companyId: string,
): Promise<WatchlistEntry | null> {
  const result = await executeSql<Row>(
    `SELECT ${SELECT_JOIN}
       FROM ${tableRef("user_watchlists")} w
       JOIN ${tableRef("companies")} c ON c.id = w.company_id
      WHERE w.user_email = ${escapeSqlValue(userEmail)}
        AND w.company_id = ${escapeSqlValue(companyId)}
      LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToEntry(row) : null;
}

/**
 * 企業の外部識別子 (corporate_number / edinet_code) から d6e companies.id を解決する。
 * どちらも見つからなければ null。
 */
export async function resolveCompanyId(hint: {
  corporateNumber?: string;
  edinetCode?: string;
}): Promise<string | null> {
  const clauses: string[] = [];
  if (hint.corporateNumber) {
    clauses.push(`corporate_number = ${escapeSqlValue(hint.corporateNumber)}`);
  }
  if (hint.edinetCode) {
    clauses.push(`edinet_code = ${escapeSqlValue(hint.edinetCode)}`);
  }
  if (clauses.length === 0) return null;

  const result = await executeSql<{ id: string }>(
    `SELECT id FROM ${tableRef("companies")}
      WHERE ${clauses.join(" OR ")}
      LIMIT 1`,
  );
  return result.rows?.[0]?.id ?? null;
}

// ---- Writes ----

export interface AddInput {
  userEmail: string;
  companyId: string;
  note?: string;
}

/** 既に存在する (user_email, company_id) の組は note だけ更新する。 */
export async function addOrUpdate(input: AddInput): Promise<WatchlistEntry> {
  const existing = await findOne(input.userEmail, input.companyId);
  if (existing) {
    if (input.note !== undefined && input.note !== existing.note) {
      await executeSql(
        `UPDATE ${tableRef("user_watchlists")}
            SET note = ${escapeSqlValue(input.note)},
                updated_at = now()
          WHERE id = ${escapeSqlValue(existing.id)}`,
      );
      const refreshed = await findOne(input.userEmail, input.companyId);
      return refreshed ?? existing;
    }
    return existing;
  }

  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("user_watchlists")}
       (id, user_email, company_id, note)
       VALUES (
         ${escapeSqlValue(id)},
         ${escapeSqlValue(input.userEmail)},
         ${escapeSqlValue(input.companyId)},
         ${escapeSqlValue(input.note)}
       )`,
  );
  if ((result.affected_rows ?? 0) < 1) {
    throw new D6eApiError("INSERT affected 0 rows", 500, "INSERT_NO_EFFECT");
  }
  const created = await findOne(input.userEmail, input.companyId);
  if (!created) {
    throw new D6eApiError(
      "INSERT succeeded but row not found",
      500,
      "INSERT_VERIFY_FAILED",
    );
  }
  return created;
}

export async function remove(
  userEmail: string,
  companyId: string,
): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("user_watchlists")}
      WHERE user_email = ${escapeSqlValue(userEmail)}
        AND company_id = ${escapeSqlValue(companyId)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}

export interface SnapshotPatch {
  fiscalYear?: number;
  revenue?: number | null;
  operatingIncome?: number | null;
  netIncome?: number | null;
  equity?: number | null;
}

/**
 * 最後に閲覧した時点の財務スナップショットを更新する。
 * 一覧ページを開いたタイミングで呼ぶことを想定。
 */
export async function markSeen(
  userEmail: string,
  companyId: string,
  snap: SnapshotPatch,
): Promise<void> {
  const assignments: string[] = ["last_viewed_at = now()"];
  if (snap.fiscalYear !== undefined) {
    assignments.push(
      `last_seen_fiscal_year = ${escapeSqlValue(snap.fiscalYear)}`,
    );
  }
  if (snap.revenue !== undefined) {
    assignments.push(`last_seen_revenue = ${escapeSqlValue(snap.revenue)}`);
  }
  if (snap.operatingIncome !== undefined) {
    assignments.push(
      `last_seen_operating_income = ${escapeSqlValue(snap.operatingIncome)}`,
    );
  }
  if (snap.netIncome !== undefined) {
    assignments.push(
      `last_seen_net_income = ${escapeSqlValue(snap.netIncome)}`,
    );
  }
  if (snap.equity !== undefined) {
    assignments.push(`last_seen_equity = ${escapeSqlValue(snap.equity)}`);
  }
  assignments.push("updated_at = now()");

  await executeSql(
    `UPDATE ${tableRef("user_watchlists")}
        SET ${assignments.join(", ")}
      WHERE user_email = ${escapeSqlValue(userEmail)}
        AND company_id = ${escapeSqlValue(companyId)}`,
  );
}

export async function updateNote(
  userEmail: string,
  companyId: string,
  note: string | null,
): Promise<boolean> {
  const result = await executeSql(
    `UPDATE ${tableRef("user_watchlists")}
        SET note = ${escapeSqlValue(note)},
            updated_at = now()
      WHERE user_email = ${escapeSqlValue(userEmail)}
        AND company_id = ${escapeSqlValue(companyId)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
