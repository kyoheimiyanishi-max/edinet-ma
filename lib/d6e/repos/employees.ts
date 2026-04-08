import "server-only";

import type {
  CompanyAssignment,
  Employee,
  EmployeeInput,
  KPI,
  KpiInput,
} from "@/lib/employees";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for the `employees` table plus its two
 * dependent tables: `employee_assignments` (companies the employee
 * covers) and `employee_kpis` (KPI tracking by period/metric).
 *
 * The `Employee` type is an aggregate — `findById` issues 3 queries
 * (employees row, assignments rows, kpi rows) and assembles. Writes
 * to assignments and KPIs go through dedicated functions that match
 * the legacy `lib/employees.ts` signature.
 */

interface EmployeeRow {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  title: string | null;
  phone: string | null;
  created_at: string;
}

interface AssignmentRow {
  id: string;
  employee_id: string;
  company_code: string | null;
  company_name: string;
  role: string | null;
  status: string | null;
  note: string | null;
  assigned_at: string;
}

interface KpiRow {
  id: string;
  employee_id: string;
  period: string;
  metric: string;
  target: string | number;
  actual: string | number;
  unit: string;
  note: string | null;
  updated_at: string;
}

const EMPLOYEE_COLUMNS =
  "id, name, email, department, title, phone, created_at";
const ASSIGNMENT_COLUMNS =
  "id, employee_id, company_code, company_name, role, status, note, assigned_at";
const KPI_COLUMNS =
  "id, employee_id, period, metric, target, actual, unit, note, updated_at";

function rowToAssignment(row: AssignmentRow): CompanyAssignment {
  return {
    companyCode: row.company_code ?? "",
    companyName: row.company_name,
    role: (row.role ?? "主担当") as CompanyAssignment["role"],
    status: (row.status ?? "アクティブ") as CompanyAssignment["status"],
    note: row.note ?? "",
    assignedAt: row.assigned_at,
  };
}

function rowToKpi(row: KpiRow): KPI {
  return {
    id: row.id,
    period: row.period,
    metric: row.metric,
    target: Number(row.target),
    actual: Number(row.actual),
    unit: row.unit,
    note: row.note ?? "",
    updatedAt: row.updated_at,
  };
}

function rowToEmployee(
  row: EmployeeRow,
  assignments: CompanyAssignment[],
  kpis: KPI[],
): Employee {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    department: row.department ?? "",
    position: row.title ?? "",
    phone: row.phone ?? "",
    createdAt: row.created_at,
    assignments,
    kpis,
  };
}

async function loadAssignmentsByEmployee(
  employeeIds: string[],
): Promise<Map<string, CompanyAssignment[]>> {
  if (employeeIds.length === 0) return new Map();
  const inList = employeeIds.map((id) => escapeSqlValue(id)).join(", ");
  const result = await executeSql<AssignmentRow>(
    `SELECT ${ASSIGNMENT_COLUMNS} FROM ${tableRef("employee_assignments")} WHERE employee_id IN (${inList}) ORDER BY assigned_at`,
  );
  const grouped = new Map<string, CompanyAssignment[]>();
  for (const row of result.rows ?? []) {
    const list = grouped.get(row.employee_id) ?? [];
    list.push(rowToAssignment(row));
    grouped.set(row.employee_id, list);
  }
  return grouped;
}

async function loadKpisByEmployee(
  employeeIds: string[],
): Promise<Map<string, KPI[]>> {
  if (employeeIds.length === 0) return new Map();
  const inList = employeeIds.map((id) => escapeSqlValue(id)).join(", ");
  const result = await executeSql<KpiRow>(
    `SELECT ${KPI_COLUMNS} FROM ${tableRef("employee_kpis")} WHERE employee_id IN (${inList}) ORDER BY period DESC`,
  );
  const grouped = new Map<string, KPI[]>();
  for (const row of result.rows ?? []) {
    const list = grouped.get(row.employee_id) ?? [];
    list.push(rowToKpi(row));
    grouped.set(row.employee_id, list);
  }
  return grouped;
}

// ---- Reads ----

export async function findAll(): Promise<Employee[]> {
  const result = await executeSql<EmployeeRow>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM ${tableRef("employees")} ORDER BY created_at`,
  );
  const rows = result.rows ?? [];
  const ids = rows.map((r) => r.id);
  const [assignmentMap, kpiMap] = await Promise.all([
    loadAssignmentsByEmployee(ids),
    loadKpisByEmployee(ids),
  ]);
  return rows.map((r) =>
    rowToEmployee(r, assignmentMap.get(r.id) ?? [], kpiMap.get(r.id) ?? []),
  );
}

export async function findById(id: string): Promise<Employee | null> {
  const result = await executeSql<EmployeeRow>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM ${tableRef("employees")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  if (!row) return null;
  const [assignmentMap, kpiMap] = await Promise.all([
    loadAssignmentsByEmployee([row.id]),
    loadKpisByEmployee([row.id]),
  ]);
  return rowToEmployee(
    row,
    assignmentMap.get(row.id) ?? [],
    kpiMap.get(row.id) ?? [],
  );
}

export async function search(query?: string): Promise<Employee[]> {
  const all = await findAll();
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.position.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q),
  );
}

export async function getAssignmentsByCompany(
  companyCode: string,
): Promise<Array<{ employee: Employee; assignment: CompanyAssignment }>> {
  const result = await executeSql<AssignmentRow>(
    `SELECT ${ASSIGNMENT_COLUMNS} FROM ${tableRef("employee_assignments")} WHERE company_code = ${escapeSqlValue(companyCode)}`,
  );
  const rows = result.rows ?? [];
  if (rows.length === 0) return [];
  const out: Array<{ employee: Employee; assignment: CompanyAssignment }> = [];
  for (const row of rows) {
    const employee = await findById(row.employee_id);
    if (employee) out.push({ employee, assignment: rowToAssignment(row) });
  }
  return out;
}

// ---- Writes (core employee) ----

export async function create(input: EmployeeInput): Promise<Employee> {
  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("employees")} (id, name, email, department, title, phone)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(input.name)},
       ${escapeSqlValue(input.email)},
       ${escapeSqlValue(input.department)},
       ${escapeSqlValue(input.position)},
       ${escapeSqlValue(input.phone)}
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
  patch: Partial<EmployeeInput>,
): Promise<Employee | null> {
  const assignments: string[] = [];
  if (patch.name !== undefined)
    assignments.push(`name = ${escapeSqlValue(patch.name)}`);
  if (patch.email !== undefined)
    assignments.push(`email = ${escapeSqlValue(patch.email)}`);
  if (patch.department !== undefined)
    assignments.push(`department = ${escapeSqlValue(patch.department)}`);
  if (patch.position !== undefined)
    assignments.push(`title = ${escapeSqlValue(patch.position)}`);
  if (patch.phone !== undefined)
    assignments.push(`phone = ${escapeSqlValue(patch.phone)}`);

  if (assignments.length === 0) return findById(id);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("employees")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  // employee_assignments and employee_kpis cascade-delete via FK.
  const result = await executeSql(
    `DELETE FROM ${tableRef("employees")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}

// ---- Assignments ----

export async function addAssignment(
  employeeId: string,
  assignment: Omit<CompanyAssignment, "assignedAt">,
): Promise<Employee | null> {
  // upsert by company_code: replace existing if present
  await executeSql(
    `DELETE FROM ${tableRef("employee_assignments")}
     WHERE employee_id = ${escapeSqlValue(employeeId)}
       AND company_code = ${escapeSqlValue(assignment.companyCode)}`,
  );
  await executeSql(
    `INSERT INTO ${tableRef("employee_assignments")}
       (id, employee_id, company_code, company_name, role, status, note)
     VALUES (
       ${escapeSqlValue(crypto.randomUUID())},
       ${escapeSqlValue(employeeId)},
       ${escapeSqlValue(assignment.companyCode)},
       ${escapeSqlValue(assignment.companyName)},
       ${escapeSqlValue(assignment.role)},
       ${escapeSqlValue(assignment.status)},
       ${escapeSqlValue(assignment.note)}
     )`,
  );
  return findById(employeeId);
}

export async function removeAssignment(
  employeeId: string,
  companyCode: string,
): Promise<Employee | null> {
  await executeSql(
    `DELETE FROM ${tableRef("employee_assignments")}
     WHERE employee_id = ${escapeSqlValue(employeeId)}
       AND company_code = ${escapeSqlValue(companyCode)}`,
  );
  return findById(employeeId);
}

// ---- KPIs ----

export async function addKpi(
  employeeId: string,
  input: KpiInput,
): Promise<Employee | null> {
  await executeSql(
    `INSERT INTO ${tableRef("employee_kpis")}
       (id, employee_id, period, metric, target, actual, unit, note)
     VALUES (
       ${escapeSqlValue(crypto.randomUUID())},
       ${escapeSqlValue(employeeId)},
       ${escapeSqlValue(input.period)},
       ${escapeSqlValue(input.metric)},
       ${escapeSqlValue(input.target)},
       ${escapeSqlValue(input.actual)},
       ${escapeSqlValue(input.unit)},
       ${escapeSqlValue(input.note)}
     )`,
  );
  return findById(employeeId);
}

export async function updateKpi(
  employeeId: string,
  kpiId: string,
  patch: Partial<KpiInput>,
): Promise<Employee | null> {
  const assignments: string[] = [];
  if (patch.period !== undefined)
    assignments.push(`period = ${escapeSqlValue(patch.period)}`);
  if (patch.metric !== undefined)
    assignments.push(`metric = ${escapeSqlValue(patch.metric)}`);
  if (patch.target !== undefined)
    assignments.push(`target = ${escapeSqlValue(patch.target)}`);
  if (patch.actual !== undefined)
    assignments.push(`actual = ${escapeSqlValue(patch.actual)}`);
  if (patch.unit !== undefined)
    assignments.push(`unit = ${escapeSqlValue(patch.unit)}`);
  if (patch.note !== undefined)
    assignments.push(`note = ${escapeSqlValue(patch.note)}`);

  if (assignments.length === 0) return findById(employeeId);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("employee_kpis")} SET ${assignments.join(", ")}
     WHERE id = ${escapeSqlValue(kpiId)}
       AND employee_id = ${escapeSqlValue(employeeId)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(employeeId);
}

export async function removeKpi(
  employeeId: string,
  kpiId: string,
): Promise<Employee | null> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("employee_kpis")}
     WHERE id = ${escapeSqlValue(kpiId)}
       AND employee_id = ${escapeSqlValue(employeeId)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(employeeId);
}
