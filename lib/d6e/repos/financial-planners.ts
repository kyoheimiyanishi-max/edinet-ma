import "server-only";

import type {
  FinancialPlanner,
  FpFilters,
  FpType,
} from "@/lib/financial-planners";
import { FP_TYPES } from "@/lib/financial-planners";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";
import { toFpType } from "./_enums";

/**
 * d6e-backed repository for the `financial_planners` table.
 */

interface FinancialPlannerRow {
  id: string;
  name: string;
  fp_type: string;
  description: string | null;
  services: string[] | null;
  certifications: string[] | null;
  target_clients: string | null;
  prefecture: string | null;
  website_url: string | null;
  listed: boolean | null;
}

const SELECT_COLUMNS =
  "id, name, fp_type, description, services, certifications, target_clients, prefecture, website_url, listed";

function rowToPlanner(row: FinancialPlannerRow): FinancialPlanner {
  return {
    id: row.id,
    name: row.name,
    type: toFpType(row.fp_type),
    description: row.description ?? "",
    services: Array.isArray(row.services) ? row.services : [],
    ...(Array.isArray(row.certifications) && row.certifications.length > 0
      ? { certifications: row.certifications }
      : {}),
    ...(row.target_clients ? { targetClients: row.target_clients } : {}),
    ...(row.prefecture ? { prefecture: row.prefecture } : {}),
    ...(row.website_url ? { url: row.website_url } : {}),
    ...(row.listed !== null ? { listed: row.listed } : {}),
  };
}

export interface FinancialPlannerInput {
  name: string;
  type: FpType;
  description: string;
  services: string[];
  certifications?: string[];
  targetClients?: string;
  prefecture?: string;
  url?: string;
  listed?: boolean;
}

function inputToColumnsAndValues(input: FinancialPlannerInput): {
  columns: string[];
  values: string[];
} {
  return {
    columns: [
      "name",
      "fp_type",
      "description",
      "services",
      "certifications",
      "target_clients",
      "prefecture",
      "website_url",
      "listed",
    ],
    values: [
      escapeSqlValue(input.name),
      escapeSqlValue(input.type),
      escapeSqlValue(input.description),
      escapeSqlValue(input.services, "jsonb"),
      escapeSqlValue(input.certifications ?? [], "jsonb"),
      escapeSqlValue(input.targetClients),
      escapeSqlValue(input.prefecture),
      escapeSqlValue(input.url),
      escapeSqlValue(input.listed ?? false),
    ],
  };
}

// ---- Reads ----

export async function findAll(): Promise<FinancialPlanner[]> {
  const result = await executeSql<FinancialPlannerRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("financial_planners")} ORDER BY name`,
  );
  return (result.rows ?? []).map(rowToPlanner);
}

export async function findById(id: string): Promise<FinancialPlanner | null> {
  const result = await executeSql<FinancialPlannerRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("financial_planners")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToPlanner(row) : null;
}

export async function findByName(
  name: string,
): Promise<FinancialPlanner | null> {
  const result = await executeSql<FinancialPlannerRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("financial_planners")} WHERE name = ${escapeSqlValue(name)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToPlanner(row) : null;
}

export async function search(
  filters: FpFilters = {},
): Promise<FinancialPlanner[]> {
  let results = await findAll();

  if (filters.type) {
    results = results.filter((p) => p.type === filters.type);
  }
  if (filters.prefecture) {
    results = results.filter((p) => p.prefecture === filters.prefecture);
  }
  if (filters.service) {
    const sv = filters.service.toLowerCase();
    results = results.filter((p) =>
      p.services.some((s) => s.toLowerCase().includes(sv)),
    );
  }
  if (filters.listedOnly) {
    results = results.filter((p) => p.listed === true);
  }
  if (filters.targetClients) {
    const tc = filters.targetClients.toLowerCase();
    results = results.filter(
      (p) =>
        p.targetClients !== undefined &&
        p.targetClients.toLowerCase().includes(tc),
    );
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.services.some((s) => s.toLowerCase().includes(q)) ||
        (p.certifications
          ? p.certifications.some((c) => c.toLowerCase().includes(q))
          : false),
    );
  }

  return results.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

// ---- Aggregations ----

export async function getAllFpServices(): Promise<string[]> {
  const result = await executeSql<{ service: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(services) AS service FROM ${tableRef("financial_planners")} ORDER BY service`,
  );
  return (result.rows ?? []).map((r) => r.service).filter((s) => s.length > 0);
}

export async function getAllFpTargetClients(): Promise<string[]> {
  const result = await executeSql<{ target_clients: string }>(
    `SELECT DISTINCT target_clients FROM ${tableRef("financial_planners")} WHERE target_clients IS NOT NULL AND target_clients <> '' ORDER BY target_clients`,
  );
  return (result.rows ?? []).map((r) => r.target_clients);
}

export async function getPresentFpTypes(): Promise<FpType[]> {
  const result = await executeSql<{ fp_type: string }>(
    `SELECT DISTINCT fp_type FROM ${tableRef("financial_planners")}`,
  );
  const present = new Set((result.rows ?? []).map((r) => r.fp_type));
  return FP_TYPES.filter((t) => present.has(t));
}

// ---- Writes ----

export async function create(
  input: FinancialPlannerInput,
): Promise<FinancialPlanner> {
  const id = crypto.randomUUID();
  const { columns, values } = inputToColumnsAndValues(input);

  const result = await executeSql(
    `INSERT INTO ${tableRef("financial_planners")} (id, ${columns.join(", ")}) VALUES (${escapeSqlValue(id)}, ${values.join(", ")})`,
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
  patch: Partial<FinancialPlannerInput>,
): Promise<FinancialPlanner | null> {
  const assignments: string[] = [];
  if (patch.name !== undefined)
    assignments.push(`name = ${escapeSqlValue(patch.name)}`);
  if (patch.type !== undefined)
    assignments.push(`fp_type = ${escapeSqlValue(patch.type)}`);
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);
  if (patch.services !== undefined)
    assignments.push(`services = ${escapeSqlValue(patch.services, "jsonb")}`);
  if (patch.certifications !== undefined)
    assignments.push(
      `certifications = ${escapeSqlValue(patch.certifications, "jsonb")}`,
    );
  if (patch.targetClients !== undefined)
    assignments.push(`target_clients = ${escapeSqlValue(patch.targetClients)}`);
  if (patch.prefecture !== undefined)
    assignments.push(`prefecture = ${escapeSqlValue(patch.prefecture)}`);
  if (patch.url !== undefined)
    assignments.push(`website_url = ${escapeSqlValue(patch.url)}`);
  if (patch.listed !== undefined)
    assignments.push(`listed = ${patch.listed ? "TRUE" : "FALSE"}`);

  if (assignments.length === 0) return findById(id);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("financial_planners")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("financial_planners")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
