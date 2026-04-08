import "server-only";

import type { Bank, BankFilters, BankType } from "@/lib/banks";
import { BANK_TYPES } from "@/lib/banks";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for the `banks` table.
 *
 * The d6e schema stores fields in snake_case; this module is the only
 * place that translates between the d6e row shape and edinet-ma's
 * `Bank` interface so the rest of the app can stay agnostic.
 */

interface BankRow {
  id: string;
  name: string;
  bank_type: string;
  description: string | null;
  ma_services: string[] | null;
  prefecture: string | null;
  website_url: string | null;
  total_assets: string | null;
  ma_team: string | null;
}

const SELECT_COLUMNS =
  "id, name, bank_type, description, ma_services, prefecture, website_url, total_assets, ma_team";

function rowToBank(row: BankRow): Bank {
  return {
    id: row.id,
    name: row.name,
    type: row.bank_type as BankType,
    description: row.description ?? "",
    maServices: Array.isArray(row.ma_services) ? row.ma_services : [],
    ...(row.prefecture ? { prefecture: row.prefecture } : {}),
    ...(row.website_url ? { url: row.website_url } : {}),
    ...(row.total_assets ? { totalAssets: row.total_assets } : {}),
    ...(row.ma_team ? { maTeam: row.ma_team } : {}),
  };
}

export interface BankInput {
  name: string;
  type: BankType;
  description: string;
  maServices: string[];
  prefecture?: string;
  url?: string;
  totalAssets?: string;
  maTeam?: string;
}

function inputToValuesAndColumns(input: BankInput): {
  columns: string[];
  values: string[];
} {
  return {
    columns: [
      "name",
      "bank_type",
      "description",
      "ma_services",
      "prefecture",
      "website_url",
      "total_assets",
      "ma_team",
    ],
    values: [
      escapeSqlValue(input.name),
      escapeSqlValue(input.type),
      escapeSqlValue(input.description),
      escapeSqlValue(input.maServices, "jsonb"),
      escapeSqlValue(input.prefecture),
      escapeSqlValue(input.url),
      escapeSqlValue(input.totalAssets),
      escapeSqlValue(input.maTeam),
    ],
  };
}

// ---- Reads ----

export async function findAll(): Promise<Bank[]> {
  const result = await executeSql<BankRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("banks")} ORDER BY name`,
  );
  return (result.rows ?? []).map(rowToBank);
}

export async function findById(id: string): Promise<Bank | null> {
  const result = await executeSql<BankRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("banks")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToBank(row) : null;
}

export async function findByName(name: string): Promise<Bank | null> {
  const result = await executeSql<BankRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("banks")} WHERE name = ${escapeSqlValue(name)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToBank(row) : null;
}

/**
 * Search banks with the same semantics as the legacy `searchBanks()`
 * helper. Filtering is performed in-memory after fetching the full
 * dataset; the table is small enough (~hundred rows) that this is
 * cheaper than building parameterised SQL with array containment.
 */
export async function search(filters: BankFilters = {}): Promise<Bank[]> {
  let results = await findAll();

  if (filters.type) {
    results = results.filter((b) => b.type === filters.type);
  }
  if (filters.prefecture) {
    results = results.filter((b) => b.prefecture === filters.prefecture);
  }
  if (filters.service) {
    const sv = filters.service.toLowerCase();
    results = results.filter((b) =>
      b.maServices.some((s) => s.toLowerCase().includes(sv)),
    );
  }
  if (filters.hasMaTeam) {
    results = results.filter((b) => Boolean(b.maTeam));
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.type.toLowerCase().includes(q) ||
        b.maServices.some((s) => s.toLowerCase().includes(q)) ||
        (b.maTeam ? b.maTeam.toLowerCase().includes(q) : false),
    );
  }

  return results;
}

// ---- Aggregations (replaces sync helpers in lib/banks.ts) ----

export async function getAllTypes(): Promise<BankType[]> {
  const result = await executeSql<{ bank_type: string }>(
    `SELECT DISTINCT bank_type FROM ${tableRef("banks")} ORDER BY bank_type`,
  );
  const present = new Set((result.rows ?? []).map((r) => r.bank_type));
  // Return in the canonical BANK_TYPES order so the UI is stable.
  return BANK_TYPES.filter((t) => present.has(t));
}

export async function getAllMaServices(): Promise<string[]> {
  const result = await executeSql<{ service: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(ma_services) AS service FROM ${tableRef(
      "banks",
    )} ORDER BY service`,
  );
  return (result.rows ?? []).map((r) => r.service).filter((s) => s.length > 0);
}

export async function getAllPrefectures(): Promise<string[]> {
  const result = await executeSql<{ prefecture: string }>(
    `SELECT DISTINCT prefecture FROM ${tableRef(
      "banks",
    )} WHERE prefecture IS NOT NULL ORDER BY prefecture`,
  );
  return (result.rows ?? []).map((r) => r.prefecture);
}

// ---- Writes ----
//
// Important: d6e-api silently strips `RETURNING` clauses from INSERT/
// UPDATE/DELETE and returns `{ affected_rows: N, executed_sql }` instead
// of rows. Writes therefore generate the UUID client-side and re-fetch
// the row by id after the mutation.

export async function create(input: BankInput): Promise<Bank> {
  const id = crypto.randomUUID();
  const { columns, values } = inputToValuesAndColumns(input);

  const result = await executeSql(
    `INSERT INTO ${tableRef("banks")} (id, ${columns.join(", ")}) VALUES (${escapeSqlValue(id)}, ${values.join(", ")})`,
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

export async function update(
  id: string,
  patch: Partial<BankInput>,
): Promise<Bank | null> {
  const assignments: string[] = [];
  if (patch.name !== undefined)
    assignments.push(`name = ${escapeSqlValue(patch.name)}`);
  if (patch.type !== undefined)
    assignments.push(`bank_type = ${escapeSqlValue(patch.type)}`);
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);
  if (patch.maServices !== undefined)
    assignments.push(
      `ma_services = ${escapeSqlValue(patch.maServices, "jsonb")}`,
    );
  if (patch.prefecture !== undefined)
    assignments.push(`prefecture = ${escapeSqlValue(patch.prefecture)}`);
  if (patch.url !== undefined)
    assignments.push(`website_url = ${escapeSqlValue(patch.url)}`);
  if (patch.totalAssets !== undefined)
    assignments.push(`total_assets = ${escapeSqlValue(patch.totalAssets)}`);
  if (patch.maTeam !== undefined)
    assignments.push(`ma_team = ${escapeSqlValue(patch.maTeam)}`);

  if (assignments.length === 0) {
    return findById(id);
  }

  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("banks")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) {
    return null;
  }
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("banks")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
