import "server-only";

import type {
  Project,
  ProjectInput,
  ProjectPriority,
  ProjectStatus,
  RelatedCompany,
} from "@/lib/projects";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";
import { toProjectPriority, toProjectStatus } from "./_enums";

/**
 * d6e-backed repository for the `projects` table.
 *
 * `assignedEmployeeIds` is sourced from the `project_assignees` join
 * table, which has a FK to `employees`. Writes synchronize that join
 * table with the supplied id list.
 */

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string | null;
  related_companies: RelatedCompany[] | null;
  start_date: string | null;
  target_date: string | null;
  seller_id: string | null;
  created_at: string;
  updated_at: string;
}

interface AssigneeRow {
  project_id: string;
  employee_id: string;
}

const SELECT_COLUMNS =
  "id, name, description, status, priority, related_companies, start_date, target_date, seller_id, created_at, updated_at";

function rowToProject(row: ProjectRow, assignedEmployeeIds: string[]): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    status: toProjectStatus(row.status) as ProjectStatus,
    priority: toProjectPriority(row.priority) as ProjectPriority,
    relatedCompanies: Array.isArray(row.related_companies)
      ? row.related_companies
      : [],
    assignedEmployeeIds,
    ...(row.seller_id ? { sellerId: row.seller_id } : {}),
    startDate: row.start_date ?? "",
    targetDate: row.target_date ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadAssigneesByProject(
  projectIds: string[],
): Promise<Map<string, string[]>> {
  if (projectIds.length === 0) return new Map();
  const inList = projectIds.map((id) => escapeSqlValue(id)).join(", ");
  const result = await executeSql<AssigneeRow>(
    `SELECT project_id, employee_id FROM ${tableRef("project_assignees")} WHERE project_id IN (${inList})`,
  );
  const grouped = new Map<string, string[]>();
  for (const row of result.rows ?? []) {
    const list = grouped.get(row.project_id) ?? [];
    list.push(row.employee_id);
    grouped.set(row.project_id, list);
  }
  return grouped;
}

async function setAssignees(
  projectId: string,
  employeeIds: string[],
): Promise<void> {
  // Replace strategy: delete + bulk insert. Simple and matches the
  // edinet-ma `assignedEmployeeIds` array semantics.
  await executeSql(
    `DELETE FROM ${tableRef("project_assignees")} WHERE project_id = ${escapeSqlValue(projectId)}`,
  );
  if (employeeIds.length === 0) return;
  const values = employeeIds
    .map((eid) => `(${escapeSqlValue(projectId)}, ${escapeSqlValue(eid)})`)
    .join(", ");
  await executeSql(
    `INSERT INTO ${tableRef("project_assignees")} (project_id, employee_id) VALUES ${values}`,
  );
}

// ---- Reads ----

export async function findAll(): Promise<Project[]> {
  const result = await executeSql<ProjectRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("projects")} ORDER BY updated_at DESC`,
  );
  const rows = result.rows ?? [];
  const assigneeMap = await loadAssigneesByProject(rows.map((r) => r.id));
  return rows.map((r) => rowToProject(r, assigneeMap.get(r.id) ?? []));
}

export async function findById(id: string): Promise<Project | null> {
  const result = await executeSql<ProjectRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("projects")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  if (!row) return null;
  const assigneeMap = await loadAssigneesByProject([row.id]);
  return rowToProject(row, assigneeMap.get(row.id) ?? []);
}

export async function search(query?: string): Promise<Project[]> {
  const all = await findAll();
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.status.includes(q) ||
      p.relatedCompanies.some(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          c.companyCode.toLowerCase().includes(q),
      ),
  );
}

export async function findBySellerId(sellerId: string): Promise<Project[]> {
  const result = await executeSql<ProjectRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("projects")} WHERE seller_id = ${escapeSqlValue(sellerId)}`,
  );
  const rows = result.rows ?? [];
  const assigneeMap = await loadAssigneesByProject(rows.map((r) => r.id));
  return rows.map((r) => rowToProject(r, assigneeMap.get(r.id) ?? []));
}

// ---- Writes ----

export async function create(input: ProjectInput): Promise<Project> {
  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("projects")}
       (id, name, description, status, priority, related_companies, start_date, target_date, seller_id)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(input.name)},
       ${escapeSqlValue(input.description)},
       ${escapeSqlValue(input.status)},
       ${escapeSqlValue(input.priority)},
       ${escapeSqlValue(input.relatedCompanies, "jsonb")},
       ${input.startDate ? escapeSqlValue(input.startDate) : "NULL"},
       ${input.targetDate ? escapeSqlValue(input.targetDate) : "NULL"},
       ${input.sellerId ? escapeSqlValue(input.sellerId) : "NULL"}
     )`,
  );
  if ((result.affected_rows ?? 0) < 1) {
    throw new D6eApiError("INSERT affected 0 rows", 500, "INSERT_NO_EFFECT");
  }
  if (input.assignedEmployeeIds.length > 0) {
    await setAssignees(id, input.assignedEmployeeIds);
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
  patch: Partial<ProjectInput>,
): Promise<Project | null> {
  const assignments: string[] = [];
  if (patch.name !== undefined)
    assignments.push(`name = ${escapeSqlValue(patch.name)}`);
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);
  if (patch.status !== undefined)
    assignments.push(`status = ${escapeSqlValue(patch.status)}`);
  if (patch.priority !== undefined)
    assignments.push(`priority = ${escapeSqlValue(patch.priority)}`);
  if (patch.relatedCompanies !== undefined)
    assignments.push(
      `related_companies = ${escapeSqlValue(patch.relatedCompanies, "jsonb")}`,
    );
  if (patch.startDate !== undefined)
    assignments.push(
      `start_date = ${patch.startDate ? escapeSqlValue(patch.startDate) : "NULL"}`,
    );
  if (patch.targetDate !== undefined)
    assignments.push(
      `target_date = ${patch.targetDate ? escapeSqlValue(patch.targetDate) : "NULL"}`,
    );
  if (patch.sellerId !== undefined)
    assignments.push(
      `seller_id = ${patch.sellerId ? escapeSqlValue(patch.sellerId) : "NULL"}`,
    );

  if (assignments.length > 0) {
    assignments.push("updated_at = now()");
    const result = await executeSql(
      `UPDATE ${tableRef("projects")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
    );
    if ((result.affected_rows ?? 0) < 1) return null;
  }

  if (patch.assignedEmployeeIds !== undefined) {
    await setAssignees(id, patch.assignedEmployeeIds);
  }

  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  // project_assignees has ON DELETE CASCADE so they go away automatically.
  const result = await executeSql(
    `DELETE FROM ${tableRef("projects")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}

/**
 * Cross-aggregate operation called from the sellers route when a seller
 * is deleted: clears the seller_id from any projects that referenced it.
 * Returns the number of projects updated.
 */
export async function clearSellerFromProjects(
  sellerId: string,
): Promise<number> {
  const result = await executeSql(
    `UPDATE ${tableRef("projects")} SET seller_id = NULL, updated_at = now() WHERE seller_id = ${escapeSqlValue(sellerId)}`,
  );
  return result.affected_rows ?? 0;
}
