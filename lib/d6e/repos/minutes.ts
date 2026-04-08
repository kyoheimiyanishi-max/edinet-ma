import "server-only";

import type {
  ActionItem,
  MeetingMinute,
  MeetingMinuteInput,
} from "@/lib/minutes";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for the `meeting_minutes` table.
 *
 * Column mapping:
 *   edinet-ma           → d6e
 *   title               → title
 *   date                → meeting_date
 *   participants        → attendees (text[])
 *   projectId           → project_id   (FK to projects)
 *   projectName         → JOIN projects.name (denormalized in result)
 *   content             → content      (added column)
 *   decisions           → decisions    (added jsonb)
 *   actionItems         → action_items (jsonb)
 */

interface MinuteRow {
  id: string;
  title: string;
  meeting_date: string;
  attendees: string[] | null;
  project_id: string | null;
  project_name: string | null;
  content: string | null;
  decisions: string[] | null;
  action_items: ActionItem[] | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLUMNS = `
  m.id,
  m.title,
  m.meeting_date,
  m.attendees,
  m.project_id,
  p.name AS project_name,
  m.content,
  m.decisions,
  m.action_items,
  m.created_at,
  m.updated_at
`;

function rowToMinute(row: MinuteRow): MeetingMinute {
  return {
    id: row.id,
    title: row.title,
    date: row.meeting_date,
    participants: Array.isArray(row.attendees) ? row.attendees : [],
    projectId: row.project_id ?? "",
    projectName: row.project_name ?? "",
    content: row.content ?? "",
    decisions: Array.isArray(row.decisions) ? row.decisions : [],
    actionItems: Array.isArray(row.action_items) ? row.action_items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromClause(): string {
  return `${tableRef("meeting_minutes")} m LEFT JOIN ${tableRef(
    "projects",
  )} p ON p.id = m.project_id`;
}

// ---- Reads ----

export async function findAll(): Promise<MeetingMinute[]> {
  const result = await executeSql<MinuteRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${fromClause()} ORDER BY m.meeting_date DESC NULLS LAST`,
  );
  return (result.rows ?? []).map(rowToMinute);
}

export async function findById(id: string): Promise<MeetingMinute | null> {
  const result = await executeSql<MinuteRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${fromClause()} WHERE m.id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToMinute(row) : null;
}

export async function search(query?: string): Promise<MeetingMinute[]> {
  const all = await findAll();
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q) ||
      m.projectName.toLowerCase().includes(q) ||
      m.participants.some((p) => p.toLowerCase().includes(q)) ||
      m.decisions.some((d) => d.toLowerCase().includes(q)) ||
      m.actionItems.some(
        (a) =>
          a.task.toLowerCase().includes(q) ||
          a.assignee.toLowerCase().includes(q),
      ),
  );
}

export async function findByProject(
  projectId: string,
): Promise<MeetingMinute[]> {
  const result = await executeSql<MinuteRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${fromClause()} WHERE m.project_id = ${escapeSqlValue(projectId)} ORDER BY m.meeting_date DESC`,
  );
  return (result.rows ?? []).map(rowToMinute);
}

export async function findByParticipant(
  name: string,
): Promise<MeetingMinute[]> {
  // Use PostgreSQL's `array_to_string` + ILIKE to filter at the DB
  // layer instead of fetching every row and filtering in JS. This
  // stays performant as the minutes table grows.
  const pattern = escapeSqlValue(
    `%${name.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`,
  );
  const result = await executeSql<MinuteRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM ${fromClause()}
     WHERE array_to_string(m.attendees, ',') ILIKE ${pattern}
     ORDER BY m.meeting_date DESC`,
  );
  return (result.rows ?? []).map(rowToMinute);
}

// ---- Writes ----

export async function create(
  input: MeetingMinuteInput,
): Promise<MeetingMinute> {
  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("meeting_minutes")}
       (id, title, meeting_date, attendees, project_id, content, decisions, action_items)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(input.title)},
       ${escapeSqlValue(input.date)},
       ${escapeSqlValue(input.participants, "ARRAY", "_text")},
       ${input.projectId ? escapeSqlValue(input.projectId) : "NULL"},
       ${escapeSqlValue(input.content)},
       ${escapeSqlValue(input.decisions, "jsonb")},
       ${escapeSqlValue(input.actionItems, "jsonb")}
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
  patch: Partial<MeetingMinuteInput>,
): Promise<MeetingMinute | null> {
  const assignments: string[] = [];
  if (patch.title !== undefined)
    assignments.push(`title = ${escapeSqlValue(patch.title)}`);
  if (patch.date !== undefined)
    assignments.push(`meeting_date = ${escapeSqlValue(patch.date)}`);
  if (patch.participants !== undefined)
    assignments.push(
      `attendees = ${escapeSqlValue(patch.participants, "ARRAY", "_text")}`,
    );
  if (patch.projectId !== undefined)
    assignments.push(
      `project_id = ${patch.projectId ? escapeSqlValue(patch.projectId) : "NULL"}`,
    );
  if (patch.content !== undefined)
    assignments.push(`content = ${escapeSqlValue(patch.content)}`);
  if (patch.decisions !== undefined)
    assignments.push(`decisions = ${escapeSqlValue(patch.decisions, "jsonb")}`);
  if (patch.actionItems !== undefined)
    assignments.push(
      `action_items = ${escapeSqlValue(patch.actionItems, "jsonb")}`,
    );

  if (assignments.length === 0) return findById(id);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("meeting_minutes")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("meeting_minutes")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
