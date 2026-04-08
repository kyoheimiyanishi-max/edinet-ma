import "server-only";

import type { SeminarEvent, SeminarFilters, SeminarTag } from "@/lib/seminars";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for the `seminars` table.
 *
 * edinet-ma stores seminars curated from connpass + other sources. The
 * d6e schema keeps the normalized fields (organizer, venue, jsonb tags)
 * and has been extended with connpass-specific columns:
 *
 *   external_id     — the connpass event_id (or other source's id)
 *   external_source — "connpass" / "peatix" / etc.
 *   started_at, ended_at — timestamptz (more precise than event_date)
 *   catch_text      — connpass catchphrase
 *   event_type      — "participation" / "advertisement"
 *   category        — legacy seed category (different from tags)
 *   accepted        — current registration count
 *
 * The SeminarEvent shape stays identical to the legacy interface so
 * pages/components don't change.
 */

interface SeminarRow {
  id: string;
  external_id: string | null;
  title: string;
  catch_text: string | null;
  description: string | null;
  registration_url: string | null;
  started_at: string | null;
  ended_at: string | null;
  venue: string | null;
  prefecture: string | null;
  city: string | null;
  organizer: string | null;
  accepted: number | null;
  capacity: number | null;
  event_type: string | null;
  category: string | null;
  tags: string[] | null;
}

const SELECT_COLUMNS =
  "id, external_id, title, catch_text, description, registration_url, started_at, ended_at, venue, prefecture, city, organizer, accepted, capacity, event_type, category, tags";

function composeAddress(
  prefecture: string | null,
  city: string | null,
): string {
  return [prefecture, city].filter((v): v is string => Boolean(v)).join("");
}

function rowToSeminar(row: SeminarRow): SeminarEvent {
  const tags = Array.isArray(row.tags) ? (row.tags as SeminarTag[]) : undefined;
  return {
    // event_id in the legacy shape is a number. connpass IDs are
    // integers; if external_id is unset, fall back to 0.
    event_id: row.external_id ? Number(row.external_id) || 0 : 0,
    title: row.title,
    catch: row.catch_text ?? "",
    description: row.description ?? "",
    event_url: row.registration_url ?? "",
    started_at: row.started_at ?? "",
    ended_at: row.ended_at ?? "",
    place: row.venue ?? "",
    address: composeAddress(row.prefecture, row.city),
    owner_display_name: row.organizer ?? "",
    accepted: row.accepted ?? 0,
    limit: row.capacity,
    event_type: row.event_type ?? "",
    category: row.category ?? "",
    ...(tags && tags.length > 0 ? { tags } : {}),
  };
}

export interface SeminarInput {
  externalId: string;
  externalSource: string;
  title: string;
  catch?: string;
  description?: string;
  registrationUrl?: string;
  startedAt?: string;
  endedAt?: string;
  venue?: string;
  prefecture?: string;
  city?: string;
  organizer?: string;
  accepted?: number;
  capacity?: number | null;
  eventType?: string;
  category?: string;
  tags?: string[];
}

function inputToColumnsAndValues(input: SeminarInput): {
  columns: string[];
  values: string[];
} {
  return {
    columns: [
      "external_id",
      "external_source",
      "title",
      "catch_text",
      "description",
      "registration_url",
      "started_at",
      "ended_at",
      "venue",
      "prefecture",
      "city",
      "organizer",
      "accepted",
      "capacity",
      "event_type",
      "category",
      "tags",
    ],
    values: [
      escapeSqlValue(input.externalId),
      escapeSqlValue(input.externalSource),
      escapeSqlValue(input.title),
      escapeSqlValue(input.catch),
      escapeSqlValue(input.description),
      escapeSqlValue(input.registrationUrl),
      escapeSqlValue(input.startedAt),
      escapeSqlValue(input.endedAt),
      escapeSqlValue(input.venue),
      escapeSqlValue(input.prefecture),
      escapeSqlValue(input.city),
      escapeSqlValue(input.organizer),
      escapeSqlValue(input.accepted ?? 0),
      escapeSqlValue(input.capacity ?? null),
      escapeSqlValue(input.eventType),
      escapeSqlValue(input.category),
      escapeSqlValue(input.tags ?? [], "jsonb"),
    ],
  };
}

// ---- Reads ----

/**
 * Return all seminars sorted with upcoming events first (by started_at
 * ascending), then past events in reverse chronological order. Mirrors
 * the sort order of the legacy `searchSeminars()` helper.
 */
export async function findAll(): Promise<SeminarEvent[]> {
  const result = await executeSql<SeminarRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("seminars")} ORDER BY started_at NULLS LAST`,
  );
  const all = (result.rows ?? []).map(rowToSeminar);
  return sortByUpcomingFirst(all);
}

export async function findById(id: string): Promise<SeminarEvent | null> {
  const result = await executeSql<SeminarRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("seminars")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToSeminar(row) : null;
}

export async function findByExternalId(
  externalSource: string,
  externalId: string,
): Promise<SeminarEvent | null> {
  const result = await executeSql<SeminarRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("seminars")} WHERE external_source = ${escapeSqlValue(
      externalSource,
    )} AND external_id = ${escapeSqlValue(externalId)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToSeminar(row) : null;
}

/**
 * Mirrors the legacy `searchSeminars()` semantics. The tag filter is
 * applied in-memory because jsonb array intersection is awkward in
 * hand-built SQL; for 1500-ish rows this is still fast.
 */
export async function search(
  filters: SeminarFilters = {},
): Promise<SeminarEvent[]> {
  const all = await findAll();
  let results = all;

  if (filters.tags && filters.tags.length > 0) {
    const wanted = filters.tags;
    if (filters.matchAllTags) {
      results = results.filter(
        (s) =>
          Array.isArray(s.tags) && wanted.every((t) => s.tags!.includes(t)),
      );
    } else {
      results = results.filter(
        (s) => Array.isArray(s.tags) && wanted.some((t) => s.tags!.includes(t)),
      );
    }
  }

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.catch.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.owner_display_name.toLowerCase().includes(q) ||
        (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
    );
  }

  return sortByUpcomingFirst(results);
}

function sortByUpcomingFirst(events: SeminarEvent[]): SeminarEvent[] {
  const now = Date.now();
  return [...events].sort((a, b) => {
    const da = new Date(a.started_at).getTime() || 0;
    const db = new Date(b.started_at).getTime() || 0;
    const aFuture = da > now;
    const bFuture = db > now;
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    if (aFuture) return da - db;
    return db - da;
  });
}

// ---- Aggregations ----

export async function getAllCategories(): Promise<string[]> {
  const result = await executeSql<{ category: string }>(
    `SELECT DISTINCT category FROM ${tableRef("seminars")} WHERE category IS NOT NULL AND category <> '' ORDER BY category`,
  );
  return (result.rows ?? []).map((r) => r.category);
}

export async function getAllOrganizers(): Promise<string[]> {
  const result = await executeSql<{ organizer: string }>(
    `SELECT DISTINCT organizer FROM ${tableRef("seminars")} WHERE organizer IS NOT NULL AND organizer <> '' ORDER BY organizer`,
  );
  return (result.rows ?? []).map((r) => r.organizer);
}

// ---- Writes ----
//
// Only `create` and `remove` are exposed. Seminars are ingested from
// connpass and other external sources; when an event changes we
// re-ingest via the seeder (delete-and-replace), keeping the row in
// sync with the upstream source of truth. Manual field-level updates
// would risk clobbering on the next seed run.

export async function create(input: SeminarInput): Promise<SeminarEvent> {
  const id = crypto.randomUUID();
  const { columns, values } = inputToColumnsAndValues(input);

  const result = await executeSql(
    `INSERT INTO ${tableRef("seminars")} (id, ${columns.join(", ")}) VALUES (${escapeSqlValue(id)}, ${values.join(", ")})`,
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
    `DELETE FROM ${tableRef("seminars")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
