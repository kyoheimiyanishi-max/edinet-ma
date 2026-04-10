import "server-only";

import type {
  TimeCategory,
  TimeEntry,
  TimeEntryInput,
} from "@/lib/time-entries";
import { TIME_CATEGORIES } from "@/lib/time-entries";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

interface TimeEntryRow {
  id: string;
  employee_id: string | null;
  user_name: string;
  entry_date: string;
  seller_id: string | null;
  seller_name: string | null;
  hours: string | number;
  category: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT = `
  t.id, t.employee_id, t.user_name, t.entry_date,
  t.seller_id, s.company_name AS seller_name,
  t.hours, t.category, t.description, t.created_at, t.updated_at
`;

function from(): string {
  return `${tableRef("time_entries")} t
    LEFT JOIN ${tableRef("sellers")} s ON s.id = t.seller_id`;
}

function narrowCategory(v: string): TimeCategory {
  if ((TIME_CATEGORIES as readonly string[]).includes(v)) {
    return v as TimeCategory;
  }
  return "その他";
}

function rowToEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    ...(row.employee_id ? { employeeId: row.employee_id } : {}),
    userName: row.user_name,
    date: row.entry_date,
    ...(row.seller_id ? { sellerId: row.seller_id } : {}),
    ...(row.seller_name ? { sellerName: row.seller_name } : {}),
    hours: Number(row.hours),
    category: narrowCategory(row.category),
    ...(row.description ? { description: row.description } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findAll(limit = 1000): Promise<TimeEntry[]> {
  const result = await executeSql<TimeEntryRow>(
    `SELECT ${SELECT} FROM ${from()} ORDER BY t.entry_date DESC, t.created_at DESC LIMIT ${limit}`,
  );
  return (result.rows ?? []).map(rowToEntry);
}

export async function findById(id: string): Promise<TimeEntry | null> {
  const result = await executeSql<TimeEntryRow>(
    `SELECT ${SELECT} FROM ${from()} WHERE t.id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToEntry(row) : null;
}

export async function findByDateRange(
  from_: string,
  to: string,
): Promise<TimeEntry[]> {
  const result = await executeSql<TimeEntryRow>(
    `SELECT ${SELECT} FROM ${from()}
     WHERE t.entry_date BETWEEN ${escapeSqlValue(from_)} AND ${escapeSqlValue(to)}
     ORDER BY t.entry_date DESC`,
  );
  return (result.rows ?? []).map(rowToEntry);
}

export async function findByUser(userName: string): Promise<TimeEntry[]> {
  const result = await executeSql<TimeEntryRow>(
    `SELECT ${SELECT} FROM ${from()}
     WHERE t.user_name = ${escapeSqlValue(userName)}
     ORDER BY t.entry_date DESC`,
  );
  return (result.rows ?? []).map(rowToEntry);
}

export async function findBySeller(sellerId: string): Promise<TimeEntry[]> {
  const result = await executeSql<TimeEntryRow>(
    `SELECT ${SELECT} FROM ${from()}
     WHERE t.seller_id = ${escapeSqlValue(sellerId)}
     ORDER BY t.entry_date DESC`,
  );
  return (result.rows ?? []).map(rowToEntry);
}

export async function create(input: TimeEntryInput): Promise<TimeEntry> {
  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("time_entries")}
       (id, employee_id, user_name, entry_date, seller_id, hours, category, description)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(input.employeeId)},
       ${escapeSqlValue(input.userName)},
       ${escapeSqlValue(input.date)},
       ${escapeSqlValue(input.sellerId)},
       ${escapeSqlValue(input.hours)},
       ${escapeSqlValue(input.category)},
       ${escapeSqlValue(input.description)}
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
  patch: Partial<TimeEntryInput>,
): Promise<TimeEntry | null> {
  const assignments: string[] = [];
  if (patch.employeeId !== undefined)
    assignments.push(`employee_id = ${escapeSqlValue(patch.employeeId)}`);
  if (patch.userName !== undefined)
    assignments.push(`user_name = ${escapeSqlValue(patch.userName)}`);
  if (patch.date !== undefined)
    assignments.push(`entry_date = ${escapeSqlValue(patch.date)}`);
  if (patch.sellerId !== undefined)
    assignments.push(`seller_id = ${escapeSqlValue(patch.sellerId)}`);
  if (patch.hours !== undefined)
    assignments.push(`hours = ${escapeSqlValue(patch.hours)}`);
  if (patch.category !== undefined)
    assignments.push(`category = ${escapeSqlValue(patch.category)}`);
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);

  if (assignments.length === 0) return findById(id);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("time_entries")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("time_entries")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
