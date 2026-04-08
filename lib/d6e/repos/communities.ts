import "server-only";

import type {
  Community,
  CommunityFilters,
  CommunityType,
} from "@/lib/communities";
import { COMMUNITY_TYPES } from "@/lib/communities";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for the `ceo_communities` table.
 *
 * Column mapping:
 *   edinet-ma    → d6e
 *   name         → community_name
 *   description  → description
 *   url          → website_url
 *   prefecture   → prefecture
 *   type         → organization_type
 *   memberCount  → member_count
 *   focusAreas   → focus_areas  (added, jsonb)
 *   established  → founded_year
 */

interface CeoCommunityRow {
  id: string;
  community_name: string;
  description: string | null;
  website_url: string | null;
  prefecture: string | null;
  organization_type: string | null;
  member_count: number | null;
  focus_areas: string[] | null;
  founded_year: number | null;
}

const SELECT_COLUMNS =
  "id, community_name, description, website_url, prefecture, organization_type, member_count, focus_areas, founded_year";

function rowToCommunity(row: CeoCommunityRow): Community {
  return {
    id: row.id,
    name: row.community_name,
    description: row.description ?? "",
    ...(row.website_url ? { url: row.website_url } : {}),
    ...(row.prefecture ? { prefecture: row.prefecture } : {}),
    type: (row.organization_type ?? "経営者団体") as CommunityType,
    ...(row.member_count !== null ? { memberCount: row.member_count } : {}),
    focusAreas: Array.isArray(row.focus_areas) ? row.focus_areas : [],
    ...(row.founded_year !== null ? { established: row.founded_year } : {}),
  };
}

export interface CommunityInput {
  name: string;
  description: string;
  url?: string;
  prefecture?: string;
  type: CommunityType;
  memberCount?: number;
  focusAreas: string[];
  established?: number;
}

function inputToColumnsAndValues(input: CommunityInput): {
  columns: string[];
  values: string[];
} {
  return {
    columns: [
      "community_name",
      "description",
      "website_url",
      "prefecture",
      "organization_type",
      "member_count",
      "focus_areas",
      "founded_year",
    ],
    values: [
      escapeSqlValue(input.name),
      escapeSqlValue(input.description),
      escapeSqlValue(input.url),
      escapeSqlValue(input.prefecture),
      escapeSqlValue(input.type),
      escapeSqlValue(input.memberCount),
      escapeSqlValue(input.focusAreas, "jsonb"),
      escapeSqlValue(input.established),
    ],
  };
}

// ---- Reads ----

export async function findAll(): Promise<Community[]> {
  const result = await executeSql<CeoCommunityRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ceo_communities")} ORDER BY community_name`,
  );
  return (result.rows ?? []).map(rowToCommunity);
}

export async function findById(id: string): Promise<Community | null> {
  const result = await executeSql<CeoCommunityRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ceo_communities")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToCommunity(row) : null;
}

export async function findByName(name: string): Promise<Community | null> {
  const result = await executeSql<CeoCommunityRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ceo_communities")} WHERE community_name = ${escapeSqlValue(name)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToCommunity(row) : null;
}

export async function search(
  filters: CommunityFilters = {},
): Promise<Community[]> {
  let results = await findAll();

  if (filters.prefecture) {
    results = results.filter((c) => c.prefecture === filters.prefecture);
  }
  if (filters.type) {
    results = results.filter((c) => c.type === filters.type);
  }
  if (filters.focusArea) {
    const f = filters.focusArea.toLowerCase();
    results = results.filter((c) =>
      c.focusAreas.some((a) => a.toLowerCase().includes(f)),
    );
  }
  if (filters.minMembers !== undefined) {
    const min = filters.minMembers;
    results = results.filter(
      (c) => c.memberCount !== undefined && c.memberCount >= min,
    );
  }
  if (filters.establishedFrom !== undefined) {
    const from = filters.establishedFrom;
    results = results.filter(
      (c) => c.established !== undefined && c.established >= from,
    );
  }
  if (filters.establishedTo !== undefined) {
    const to = filters.establishedTo;
    results = results.filter(
      (c) => c.established !== undefined && c.established <= to,
    );
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.focusAreas.some((f) => f.toLowerCase().includes(q)),
    );
  }

  return results;
}

// ---- Aggregations ----

export async function getAllTypes(): Promise<CommunityType[]> {
  const result = await executeSql<{ organization_type: string }>(
    `SELECT DISTINCT organization_type FROM ${tableRef("ceo_communities")} WHERE organization_type IS NOT NULL`,
  );
  const present = new Set((result.rows ?? []).map((r) => r.organization_type));
  return COMMUNITY_TYPES.filter((t) => present.has(t));
}

export async function getAllPrefectures(): Promise<string[]> {
  const result = await executeSql<{ prefecture: string }>(
    `SELECT DISTINCT prefecture FROM ${tableRef("ceo_communities")} WHERE prefecture IS NOT NULL ORDER BY prefecture`,
  );
  return (result.rows ?? []).map((r) => r.prefecture);
}

export async function getAllFocusAreas(): Promise<string[]> {
  const result = await executeSql<{ area: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(focus_areas) AS area FROM ${tableRef(
      "ceo_communities",
    )} ORDER BY area`,
  );
  return (result.rows ?? []).map((r) => r.area).filter((a) => a.length > 0);
}

// ---- Writes ----

export async function create(input: CommunityInput): Promise<Community> {
  const id = crypto.randomUUID();
  const { columns, values } = inputToColumnsAndValues(input);

  const result = await executeSql(
    `INSERT INTO ${tableRef("ceo_communities")} (id, ${columns.join(", ")}) VALUES (${escapeSqlValue(id)}, ${values.join(", ")})`,
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
  patch: Partial<CommunityInput>,
): Promise<Community | null> {
  const assignments: string[] = [];
  if (patch.name !== undefined)
    assignments.push(`community_name = ${escapeSqlValue(patch.name)}`);
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);
  if (patch.url !== undefined)
    assignments.push(`website_url = ${escapeSqlValue(patch.url)}`);
  if (patch.prefecture !== undefined)
    assignments.push(`prefecture = ${escapeSqlValue(patch.prefecture)}`);
  if (patch.type !== undefined)
    assignments.push(`organization_type = ${escapeSqlValue(patch.type)}`);
  if (patch.memberCount !== undefined)
    assignments.push(`member_count = ${escapeSqlValue(patch.memberCount)}`);
  if (patch.focusAreas !== undefined)
    assignments.push(
      `focus_areas = ${escapeSqlValue(patch.focusAreas, "jsonb")}`,
    );
  if (patch.established !== undefined)
    assignments.push(`founded_year = ${escapeSqlValue(patch.established)}`);

  if (assignments.length === 0) return findById(id);

  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("ceo_communities")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("ceo_communities")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
