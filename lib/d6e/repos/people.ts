import "server-only";

import type {
  PeopleFilters,
  Person,
  PersonCategory,
  PersonLink,
} from "@/lib/people";
import { CATEGORIES } from "@/lib/people";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for the `ma_people` table.
 *
 * The d6e schema uses snake_case columns; this module is the only
 * place that translates between the d6e row shape and edinet-ma's
 * `Person` interface. Column mapping:
 *
 *   edinet-ma       → d6e
 *   name            → name
 *   nameEn          → name_en       (added for edinet-ma)
 *   role            → title
 *   organization    → company
 *   description     → profile
 *   category        → category       (added, enum)
 *   notableDeals    → notable_deals  (jsonb)
 *   links           → links          (added, jsonb)
 */

interface MaPersonRow {
  id: string;
  name: string;
  name_en: string | null;
  title: string | null;
  company: string | null;
  profile: string | null;
  category: string | null;
  notable_deals: string[] | null;
  links: PersonLink[] | null;
}

const SELECT_COLUMNS =
  "id, name, name_en, title, company, profile, category, notable_deals, links";

function rowToPerson(row: MaPersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    ...(row.name_en ? { nameEn: row.name_en } : {}),
    role: row.title ?? "",
    organization: row.company ?? "",
    description: row.profile ?? "",
    category: (row.category ?? "アドバイザー") as PersonCategory,
    notableDeals: Array.isArray(row.notable_deals) ? row.notable_deals : [],
    links: Array.isArray(row.links) ? row.links : [],
  };
}

export interface PersonInput {
  name: string;
  nameEn?: string;
  role: string;
  organization: string;
  description: string;
  category: PersonCategory;
  notableDeals: string[];
  links: PersonLink[];
}

function inputToColumnsAndValues(input: PersonInput): {
  columns: string[];
  values: string[];
} {
  return {
    columns: [
      "name",
      "name_en",
      "title",
      "company",
      "profile",
      "category",
      "notable_deals",
      "links",
    ],
    values: [
      escapeSqlValue(input.name),
      escapeSqlValue(input.nameEn),
      escapeSqlValue(input.role),
      escapeSqlValue(input.organization),
      escapeSqlValue(input.description),
      escapeSqlValue(input.category),
      escapeSqlValue(input.notableDeals, "jsonb"),
      escapeSqlValue(input.links, "jsonb"),
    ],
  };
}

// ---- Reads ----

export async function findAll(): Promise<Person[]> {
  const result = await executeSql<MaPersonRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_people")} ORDER BY name`,
  );
  return (result.rows ?? []).map(rowToPerson);
}

export async function findById(id: string): Promise<Person | null> {
  const result = await executeSql<MaPersonRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_people")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToPerson(row) : null;
}

export async function findByName(name: string): Promise<Person | null> {
  const result = await executeSql<MaPersonRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_people")} WHERE name = ${escapeSqlValue(name)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToPerson(row) : null;
}

/** Mirrors the legacy `searchPeople()` semantics. */
export async function search(filters: PeopleFilters = {}): Promise<Person[]> {
  let results = await findAll();

  if (filters.category) {
    results = results.filter((p) => p.category === filters.category);
  }
  if (filters.organization) {
    const org = filters.organization.toLowerCase();
    results = results.filter((p) => p.organization.toLowerCase().includes(org));
  }
  if (filters.deal) {
    const deal = filters.deal.toLowerCase();
    results = results.filter((p) =>
      p.notableDeals.some((d) => d.toLowerCase().includes(deal)),
    );
  }
  if (filters.hasLinks) {
    results = results.filter((p) => p.links.length > 0);
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameEn ? p.nameEn.toLowerCase().includes(q) : false) ||
        p.organization.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.notableDeals.some((d) => d.toLowerCase().includes(q)),
    );
  }

  return results;
}

// ---- Aggregations ----

export async function getAllCategories(): Promise<PersonCategory[]> {
  const result = await executeSql<{ category: string }>(
    `SELECT DISTINCT category FROM ${tableRef("ma_people")} WHERE category IS NOT NULL`,
  );
  const present = new Set((result.rows ?? []).map((r) => r.category));
  return CATEGORIES.filter((c) => present.has(c));
}

export async function getAllOrganizations(): Promise<string[]> {
  const result = await executeSql<{ company: string }>(
    `SELECT DISTINCT company FROM ${tableRef("ma_people")} WHERE company IS NOT NULL AND company <> '' ORDER BY company`,
  );
  return (result.rows ?? []).map((r) => r.company);
}

export async function getAllNotableDeals(): Promise<string[]> {
  const result = await executeSql<{ deal: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(notable_deals) AS deal FROM ${tableRef(
      "ma_people",
    )} ORDER BY deal`,
  );
  return (result.rows ?? []).map((r) => r.deal).filter((d) => d.length > 0);
}

// ---- Writes ----

export async function create(input: PersonInput): Promise<Person> {
  const id = crypto.randomUUID();
  const { columns, values } = inputToColumnsAndValues(input);

  const result = await executeSql(
    `INSERT INTO ${tableRef("ma_people")} (id, ${columns.join(", ")}) VALUES (${escapeSqlValue(id)}, ${values.join(", ")})`,
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
  patch: Partial<PersonInput>,
): Promise<Person | null> {
  const assignments: string[] = [];
  if (patch.name !== undefined)
    assignments.push(`name = ${escapeSqlValue(patch.name)}`);
  if (patch.nameEn !== undefined)
    assignments.push(`name_en = ${escapeSqlValue(patch.nameEn)}`);
  if (patch.role !== undefined)
    assignments.push(`title = ${escapeSqlValue(patch.role)}`);
  if (patch.organization !== undefined)
    assignments.push(`company = ${escapeSqlValue(patch.organization)}`);
  if (patch.description !== undefined)
    assignments.push(`profile = ${escapeSqlValue(patch.description)}`);
  if (patch.category !== undefined)
    assignments.push(`category = ${escapeSqlValue(patch.category)}`);
  if (patch.notableDeals !== undefined)
    assignments.push(
      `notable_deals = ${escapeSqlValue(patch.notableDeals, "jsonb")}`,
    );
  if (patch.links !== undefined)
    assignments.push(`links = ${escapeSqlValue(patch.links, "jsonb")}`);

  if (assignments.length === 0) return findById(id);

  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("ma_people")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("ma_people")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
