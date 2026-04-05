import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ---- Types ----

export interface CompanyAssignment {
  companyCode: string;
  companyName: string;
  role: "主担当" | "副担当" | "サポート";
  status: "アクティブ" | "フォロー中" | "完了";
  note: string;
  assignedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  phone: string;
  createdAt: string;
  assignments: CompanyAssignment[];
}

export type EmployeeInput = Omit<Employee, "id" | "createdAt" | "assignments">;

export const DEPARTMENTS = [
  "M&Aアドバイザリー部",
  "法人営業部",
  "事業開発部",
  "経営企画部",
  "財務部",
  "法務部",
  "その他",
] as const;

export const POSITIONS = [
  "代表取締役",
  "取締役",
  "執行役員",
  "部長",
  "次長",
  "課長",
  "主任",
  "担当",
] as const;

export const ASSIGNMENT_ROLES = ["主担当", "副担当", "サポート"] as const;
export const ASSIGNMENT_STATUSES = [
  "アクティブ",
  "フォロー中",
  "完了",
] as const;

// ---- Storage ----

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "employees.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readAll(): Employee[] {
  ensureDataFile();
  return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Employee[];
}

function writeAll(employees: Employee[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(employees, null, 2), "utf-8");
}

// ---- CRUD ----

export function getAllEmployees(): Employee[] {
  return readAll();
}

export function getEmployee(id: string): Employee | undefined {
  return readAll().find((e) => e.id === id);
}

export function createEmployee(input: EmployeeInput): Employee {
  const employees = readAll();
  const employee: Employee = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    assignments: [],
  };
  employees.push(employee);
  writeAll(employees);
  return employee;
}

export function updateEmployee(
  id: string,
  input: Partial<EmployeeInput>,
): Employee | null {
  const employees = readAll();
  const idx = employees.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  employees[idx] = { ...employees[idx], ...input };
  writeAll(employees);
  return employees[idx];
}

export function deleteEmployee(id: string): boolean {
  const employees = readAll();
  const filtered = employees.filter((e) => e.id !== id);
  if (filtered.length === employees.length) return false;
  writeAll(filtered);
  return true;
}

// ---- Assignments ----

export function addAssignment(
  employeeId: string,
  assignment: Omit<CompanyAssignment, "assignedAt">,
): Employee | null {
  const employees = readAll();
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return null;

  const existing = emp.assignments.findIndex(
    (a) => a.companyCode === assignment.companyCode,
  );
  if (existing !== -1) {
    emp.assignments[existing] = {
      ...assignment,
      assignedAt: emp.assignments[existing].assignedAt,
    };
  } else {
    emp.assignments.push({
      ...assignment,
      assignedAt: new Date().toISOString(),
    });
  }

  writeAll(employees);
  return emp;
}

export function removeAssignment(
  employeeId: string,
  companyCode: string,
): Employee | null {
  const employees = readAll();
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return null;
  emp.assignments = emp.assignments.filter(
    (a) => a.companyCode !== companyCode,
  );
  writeAll(employees);
  return emp;
}

export function getAssignmentsByCompany(
  companyCode: string,
): Array<{ employee: Employee; assignment: CompanyAssignment }> {
  const results: Array<{ employee: Employee; assignment: CompanyAssignment }> =
    [];
  for (const emp of readAll()) {
    const assignment = emp.assignments.find(
      (a) => a.companyCode === companyCode,
    );
    if (assignment) {
      results.push({ employee: emp, assignment });
    }
  }
  return results;
}

// ---- Search ----

export function searchEmployees(query?: string): Employee[] {
  const all = readAll();
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
