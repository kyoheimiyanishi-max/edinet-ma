import "server-only";

import type {
  MaAdvisor,
  MaAdvisorFilters,
  MaAdvisorType,
} from "@/lib/ma-advisors";
import { MA_ADVISOR_TYPES } from "@/lib/ma-advisors";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";
import { toAllianceContactStatus, toMaAdvisorType } from "./_enums";

/**
 * d6e-backed repository for the `ma_advisors` table (curated M&A
 * advisory firms, separate from the generic `ma_firms` used elsewhere).
 */

interface MaAdvisorRow {
  id: string;
  name: string;
  advisor_type: string;
  description: string | null;
  services: string[] | null;
  prefecture: string | null;
  website_url: string | null;
  listed: boolean | null;
  target_size: string | null;
  contact_status: string | null;
}

const SELECT_COLUMNS =
  "id, name, advisor_type, description, services, prefecture, website_url, listed, target_size, contact_status";

function rowToAdvisor(row: MaAdvisorRow): MaAdvisor {
  return {
    id: row.id,
    name: row.name,
    type: toMaAdvisorType(row.advisor_type),
    description: row.description ?? "",
    services: Array.isArray(row.services) ? row.services : [],
    ...(row.prefecture ? { prefecture: row.prefecture } : {}),
    ...(row.website_url ? { url: row.website_url } : {}),
    ...(row.listed !== null ? { listed: row.listed } : {}),
    ...(row.target_size ? { targetSize: row.target_size } : {}),
    contactStatus: toAllianceContactStatus(row.contact_status),
  };
}

export interface MaAdvisorInput {
  name: string;
  type: MaAdvisorType;
  description: string;
  services: string[];
  prefecture?: string;
  url?: string;
  listed?: boolean;
  targetSize?: string;
  contactStatus?: string;
}

function inputToColumnsAndValues(input: MaAdvisorInput): {
  columns: string[];
  values: string[];
} {
  return {
    columns: [
      "name",
      "advisor_type",
      "description",
      "services",
      "prefecture",
      "website_url",
      "listed",
      "target_size",
      "contact_status",
    ],
    values: [
      escapeSqlValue(input.name),
      escapeSqlValue(input.type),
      escapeSqlValue(input.description),
      escapeSqlValue(input.services, "jsonb"),
      escapeSqlValue(input.prefecture),
      escapeSqlValue(input.url),
      escapeSqlValue(input.listed ?? false),
      escapeSqlValue(input.targetSize),
      escapeSqlValue(input.contactStatus ?? "none"),
    ],
  };
}

// ---- Reads ----

export async function findAll(): Promise<MaAdvisor[]> {
  const result = await executeSql<MaAdvisorRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_advisors")} ORDER BY name`,
  );
  return (result.rows ?? []).map(rowToAdvisor);
}

export async function findById(id: string): Promise<MaAdvisor | null> {
  const result = await executeSql<MaAdvisorRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_advisors")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToAdvisor(row) : null;
}

export async function findByName(name: string): Promise<MaAdvisor | null> {
  const result = await executeSql<MaAdvisorRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_advisors")} WHERE name = ${escapeSqlValue(name)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToAdvisor(row) : null;
}

export async function search(
  filters: MaAdvisorFilters = {},
): Promise<MaAdvisor[]> {
  let results = await findAll();

  if (filters.type) {
    results = results.filter((a) => a.type === filters.type);
  }
  if (filters.prefecture) {
    results = results.filter((a) => a.prefecture === filters.prefecture);
  }
  if (filters.service) {
    const sv = filters.service.toLowerCase();
    results = results.filter((a) =>
      a.services.some((s) => s.toLowerCase().includes(sv)),
    );
  }
  if (filters.listedOnly) {
    results = results.filter((a) => a.listed === true);
  }
  if (filters.targetSize) {
    results = results.filter((a) => a.targetSize === filters.targetSize);
  }
  if (filters.contactStatus) {
    results = results.filter((a) => a.contactStatus === filters.contactStatus);
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.services.some((s) => s.toLowerCase().includes(q)),
    );
  }

  return results.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

// ---- Aggregations ----

export async function getAllMaAdvisorServices(): Promise<string[]> {
  const result = await executeSql<{ service: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(services) AS service FROM ${tableRef("ma_advisors")} ORDER BY service`,
  );
  return (result.rows ?? []).map((r) => r.service).filter((s) => s.length > 0);
}

export async function getAllMaAdvisorTargetSizes(): Promise<string[]> {
  const result = await executeSql<{ target_size: string }>(
    `SELECT DISTINCT target_size FROM ${tableRef("ma_advisors")} WHERE target_size IS NOT NULL AND target_size <> '' ORDER BY target_size`,
  );
  return (result.rows ?? []).map((r) => r.target_size);
}

export async function getPresentMaAdvisorTypes(): Promise<MaAdvisorType[]> {
  const result = await executeSql<{ advisor_type: string }>(
    `SELECT DISTINCT advisor_type FROM ${tableRef("ma_advisors")}`,
  );
  const present = new Set((result.rows ?? []).map((r) => r.advisor_type));
  return MA_ADVISOR_TYPES.filter((t) => present.has(t));
}

// ---- Writes ----

export async function create(input: MaAdvisorInput): Promise<MaAdvisor> {
  const id = crypto.randomUUID();
  const { columns, values } = inputToColumnsAndValues(input);

  const result = await executeSql(
    `INSERT INTO ${tableRef("ma_advisors")} (id, ${columns.join(", ")}) VALUES (${escapeSqlValue(id)}, ${values.join(", ")})`,
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
  patch: Partial<MaAdvisorInput>,
): Promise<MaAdvisor | null> {
  const assignments: string[] = [];
  if (patch.name !== undefined)
    assignments.push(`name = ${escapeSqlValue(patch.name)}`);
  if (patch.type !== undefined)
    assignments.push(`advisor_type = ${escapeSqlValue(patch.type)}`);
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);
  if (patch.services !== undefined)
    assignments.push(`services = ${escapeSqlValue(patch.services, "jsonb")}`);
  if (patch.prefecture !== undefined)
    assignments.push(`prefecture = ${escapeSqlValue(patch.prefecture)}`);
  if (patch.url !== undefined)
    assignments.push(`website_url = ${escapeSqlValue(patch.url)}`);
  if (patch.listed !== undefined)
    assignments.push(`listed = ${patch.listed ? "TRUE" : "FALSE"}`);
  if (patch.targetSize !== undefined)
    assignments.push(`target_size = ${escapeSqlValue(patch.targetSize)}`);
  if (patch.contactStatus !== undefined)
    assignments.push(`contact_status = ${escapeSqlValue(patch.contactStatus)}`);

  if (assignments.length === 0) return findById(id);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("ma_advisors")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("ma_advisors")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
