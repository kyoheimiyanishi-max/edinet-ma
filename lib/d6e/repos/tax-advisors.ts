import "server-only";

import type {
  AdvisorFilters,
  AdvisorType,
  TaxAdvisor,
} from "@/lib/tax-advisors";
import { ADVISOR_TYPES } from "@/lib/tax-advisors";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";
import { toAdvisorType } from "./_enums";

/**
 * d6e-backed repository for the `tax_advisors` table.
 *
 * Mirrors the shape of `lib/d6e/repos/banks.ts`. The d6e schema uses
 * snake_case columns; this module is the only place that translates
 * between the d6e row shape and edinet-ma's `TaxAdvisor` interface.
 */

interface TaxAdvisorRow {
  id: string;
  name: string;
  advisor_type: string;
  description: string | null;
  specialties: string[] | null;
  prefecture: string | null;
  website_url: string | null;
  firm_size: string | null;
  notable_services: string[] | null;
}

const SELECT_COLUMNS =
  "id, name, advisor_type, description, specialties, prefecture, website_url, firm_size, notable_services";

function rowToAdvisor(row: TaxAdvisorRow): TaxAdvisor {
  return {
    id: row.id,
    name: row.name,
    type: toAdvisorType(row.advisor_type),
    description: row.description ?? "",
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    ...(row.prefecture ? { prefecture: row.prefecture } : {}),
    ...(row.website_url ? { url: row.website_url } : {}),
    ...(row.firm_size ? { size: row.firm_size } : {}),
    ...(Array.isArray(row.notable_services) && row.notable_services.length > 0
      ? { notableServices: row.notable_services }
      : {}),
  };
}

export interface TaxAdvisorInput {
  name: string;
  type: AdvisorType;
  description: string;
  specialties: string[];
  prefecture?: string;
  url?: string;
  size?: string;
  notableServices?: string[];
}

function inputToValuesAndColumns(input: TaxAdvisorInput): {
  columns: string[];
  values: string[];
} {
  return {
    columns: [
      "name",
      "advisor_type",
      "description",
      "specialties",
      "prefecture",
      "website_url",
      "firm_size",
      "notable_services",
    ],
    values: [
      escapeSqlValue(input.name),
      escapeSqlValue(input.type),
      escapeSqlValue(input.description),
      escapeSqlValue(input.specialties, "jsonb"),
      escapeSqlValue(input.prefecture),
      escapeSqlValue(input.url),
      escapeSqlValue(input.size),
      escapeSqlValue(input.notableServices ?? [], "jsonb"),
    ],
  };
}

// ---- Reads ----

export async function findAll(): Promise<TaxAdvisor[]> {
  const result = await executeSql<TaxAdvisorRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("tax_advisors")} ORDER BY name`,
  );
  return (result.rows ?? []).map(rowToAdvisor);
}

export async function findById(id: string): Promise<TaxAdvisor | null> {
  const result = await executeSql<TaxAdvisorRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("tax_advisors")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToAdvisor(row) : null;
}

export async function findByName(name: string): Promise<TaxAdvisor | null> {
  const result = await executeSql<TaxAdvisorRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("tax_advisors")} WHERE name = ${escapeSqlValue(name)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToAdvisor(row) : null;
}

/**
 * Mirrors the legacy `searchAdvisors()` semantics. Filters are applied
 * in-memory after fetching the full dataset; this is fast enough for the
 * current size and avoids hand-crafting jsonb containment SQL.
 */
export async function search(
  filters: AdvisorFilters = {},
): Promise<TaxAdvisor[]> {
  let results = await findAll();

  if (filters.type) {
    results = results.filter((a) => a.type === filters.type);
  }
  if (filters.prefecture) {
    results = results.filter((a) => a.prefecture === filters.prefecture);
  }
  if (filters.specialty) {
    const sp = filters.specialty.toLowerCase();
    results = results.filter((a) =>
      a.specialties.some((s) => s.toLowerCase().includes(sp)),
    );
  }
  if (filters.size) {
    const sz = filters.size.toLowerCase();
    results = results.filter(
      (a) => a.size !== undefined && a.size.toLowerCase().includes(sz),
    );
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.specialties.some((s) => s.toLowerCase().includes(q)) ||
        (a.notableServices
          ? a.notableServices.some((s) => s.toLowerCase().includes(q))
          : false),
    );
  }

  return results;
}

// ---- Aggregations ----

export async function getAllTypes(): Promise<AdvisorType[]> {
  const result = await executeSql<{ advisor_type: string }>(
    `SELECT DISTINCT advisor_type FROM ${tableRef("tax_advisors")}`,
  );
  const present = new Set((result.rows ?? []).map((r) => r.advisor_type));
  return ADVISOR_TYPES.filter((t) => present.has(t));
}

export async function getAllSpecialties(): Promise<string[]> {
  const result = await executeSql<{ specialty: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(specialties) AS specialty FROM ${tableRef(
      "tax_advisors",
    )} ORDER BY specialty`,
  );
  return (result.rows ?? [])
    .map((r) => r.specialty)
    .filter((s) => s.length > 0);
}

export async function getAllSizes(): Promise<string[]> {
  const result = await executeSql<{ firm_size: string }>(
    `SELECT DISTINCT firm_size FROM ${tableRef(
      "tax_advisors",
    )} WHERE firm_size IS NOT NULL ORDER BY firm_size`,
  );
  return (result.rows ?? []).map((r) => r.firm_size);
}

export async function getAllPrefectures(): Promise<string[]> {
  const result = await executeSql<{ prefecture: string }>(
    `SELECT DISTINCT prefecture FROM ${tableRef(
      "tax_advisors",
    )} WHERE prefecture IS NOT NULL ORDER BY prefecture`,
  );
  return (result.rows ?? []).map((r) => r.prefecture);
}

// ---- Writes ----
//
// d6e-api strips RETURNING clauses; we generate the UUID client-side and
// re-fetch the row by id after the mutation.

export async function create(input: TaxAdvisorInput): Promise<TaxAdvisor> {
  const id = crypto.randomUUID();
  const { columns, values } = inputToValuesAndColumns(input);

  const result = await executeSql(
    `INSERT INTO ${tableRef("tax_advisors")} (id, ${columns.join(", ")}) VALUES (${escapeSqlValue(id)}, ${values.join(", ")})`,
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
  patch: Partial<TaxAdvisorInput>,
): Promise<TaxAdvisor | null> {
  const assignments: string[] = [];
  if (patch.name !== undefined)
    assignments.push(`name = ${escapeSqlValue(patch.name)}`);
  if (patch.type !== undefined)
    assignments.push(`advisor_type = ${escapeSqlValue(patch.type)}`);
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);
  if (patch.specialties !== undefined)
    assignments.push(
      `specialties = ${escapeSqlValue(patch.specialties, "jsonb")}`,
    );
  if (patch.prefecture !== undefined)
    assignments.push(`prefecture = ${escapeSqlValue(patch.prefecture)}`);
  if (patch.url !== undefined)
    assignments.push(`website_url = ${escapeSqlValue(patch.url)}`);
  if (patch.size !== undefined)
    assignments.push(`firm_size = ${escapeSqlValue(patch.size)}`);
  if (patch.notableServices !== undefined)
    assignments.push(
      `notable_services = ${escapeSqlValue(patch.notableServices, "jsonb")}`,
    );

  if (assignments.length === 0) {
    return findById(id);
  }

  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("tax_advisors")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) {
    return null;
  }
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("tax_advisors")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
