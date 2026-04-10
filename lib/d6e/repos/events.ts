import "server-only";

import type {
  CalendarEvent,
  CalendarEventInput,
  EventStatus,
  EventType,
} from "@/lib/events";
import { EVENT_STATUSES, EVENT_TYPES } from "@/lib/events";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

interface EventRow {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  seller_id: string | null;
  seller_name: string | null;
  buyer_company_id: string | null;
  buyer_company_name: string | null;
  attendees: string[] | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const SELECT = `
  e.id, e.title, e.event_type, e.event_date, e.start_time, e.end_time,
  e.location,
  e.seller_id, s.company_name AS seller_name,
  e.buyer_company_id, c.name AS buyer_company_name,
  e.attendees, e.description, e.status,
  e.created_at, e.updated_at
`;

function from(): string {
  return `${tableRef("events")} e
    LEFT JOIN ${tableRef("sellers")} s ON s.id = e.seller_id
    LEFT JOIN ${tableRef("companies")} c ON c.id = e.buyer_company_id`;
}

function narrowType(v: string): EventType {
  if ((EVENT_TYPES as readonly string[]).includes(v)) return v as EventType;
  return "その他";
}

function narrowStatus(v: string): EventStatus {
  if ((EVENT_STATUSES as readonly string[]).includes(v))
    return v as EventStatus;
  return "予定";
}

function rowToEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    eventType: narrowType(row.event_type),
    date: row.event_date,
    ...(row.start_time ? { startTime: row.start_time } : {}),
    ...(row.end_time ? { endTime: row.end_time } : {}),
    ...(row.location ? { location: row.location } : {}),
    ...(row.seller_id ? { sellerId: row.seller_id } : {}),
    ...(row.seller_name ? { sellerName: row.seller_name } : {}),
    ...(row.buyer_company_id ? { buyerCompanyId: row.buyer_company_id } : {}),
    ...(row.buyer_company_name
      ? { buyerCompanyName: row.buyer_company_name }
      : {}),
    attendees: Array.isArray(row.attendees) ? row.attendees : [],
    ...(row.description ? { description: row.description } : {}),
    status: narrowStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findAll(limit = 500): Promise<CalendarEvent[]> {
  const result = await executeSql<EventRow>(
    `SELECT ${SELECT} FROM ${from()} ORDER BY e.event_date DESC, e.start_time NULLS LAST LIMIT ${limit}`,
  );
  return (result.rows ?? []).map(rowToEvent);
}

export async function findById(id: string): Promise<CalendarEvent | null> {
  const result = await executeSql<EventRow>(
    `SELECT ${SELECT} FROM ${from()} WHERE e.id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToEvent(row) : null;
}

export async function findUpcoming(limit = 50): Promise<CalendarEvent[]> {
  const result = await executeSql<EventRow>(
    `SELECT ${SELECT} FROM ${from()}
     WHERE e.event_date >= CURRENT_DATE AND e.status = '予定'
     ORDER BY e.event_date ASC, e.start_time NULLS LAST
     LIMIT ${limit}`,
  );
  return (result.rows ?? []).map(rowToEvent);
}

export async function findBySeller(sellerId: string): Promise<CalendarEvent[]> {
  const result = await executeSql<EventRow>(
    `SELECT ${SELECT} FROM ${from()}
     WHERE e.seller_id = ${escapeSqlValue(sellerId)}
     ORDER BY e.event_date DESC`,
  );
  return (result.rows ?? []).map(rowToEvent);
}

export async function create(
  input: CalendarEventInput,
): Promise<CalendarEvent> {
  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("events")}
       (id, title, event_type, event_date, start_time, end_time, location,
        seller_id, buyer_company_id, attendees, description, status)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(input.title)},
       ${escapeSqlValue(input.eventType)},
       ${escapeSqlValue(input.date)},
       ${escapeSqlValue(input.startTime)},
       ${escapeSqlValue(input.endTime)},
       ${escapeSqlValue(input.location)},
       ${escapeSqlValue(input.sellerId)},
       ${escapeSqlValue(input.buyerCompanyId)},
       ${escapeSqlValue(input.attendees ?? [], "ARRAY", "_text")},
       ${escapeSqlValue(input.description)},
       ${escapeSqlValue(input.status ?? "予定")}
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

export async function update(
  id: string,
  patch: Partial<CalendarEventInput>,
): Promise<CalendarEvent | null> {
  const assignments: string[] = [];
  if (patch.title !== undefined)
    assignments.push(`title = ${escapeSqlValue(patch.title)}`);
  if (patch.eventType !== undefined)
    assignments.push(`event_type = ${escapeSqlValue(patch.eventType)}`);
  if (patch.date !== undefined)
    assignments.push(`event_date = ${escapeSqlValue(patch.date)}`);
  if (patch.startTime !== undefined)
    assignments.push(`start_time = ${escapeSqlValue(patch.startTime)}`);
  if (patch.endTime !== undefined)
    assignments.push(`end_time = ${escapeSqlValue(patch.endTime)}`);
  if (patch.location !== undefined)
    assignments.push(`location = ${escapeSqlValue(patch.location)}`);
  if (patch.sellerId !== undefined)
    assignments.push(`seller_id = ${escapeSqlValue(patch.sellerId)}`);
  if (patch.buyerCompanyId !== undefined)
    assignments.push(
      `buyer_company_id = ${escapeSqlValue(patch.buyerCompanyId)}`,
    );
  if (patch.attendees !== undefined)
    assignments.push(
      `attendees = ${escapeSqlValue(patch.attendees, "ARRAY", "_text")}`,
    );
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);
  if (patch.status !== undefined)
    assignments.push(`status = ${escapeSqlValue(patch.status)}`);

  if (assignments.length === 0) return findById(id);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("events")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("events")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
