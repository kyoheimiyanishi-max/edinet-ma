import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ---- Types ----

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  relatedCompanies: RelatedCompany[];
  assignedEmployeeIds: string[];
  sellerId?: string;
  startDate: string;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface RelatedCompany {
  companyCode: string;
  companyName: string;
  role: "買収対象" | "売却対象" | "アドバイザー" | "その他";
}

export type ProjectStatus =
  | "企画中"
  | "調査中"
  | "交渉中"
  | "DD実施中"
  | "契約締結"
  | "完了"
  | "中止";

export type ProjectPriority = "高" | "中" | "低";

export type ProjectInput = Omit<Project, "id" | "createdAt" | "updatedAt">;

export const PROJECT_STATUSES: ProjectStatus[] = [
  "企画中",
  "調査中",
  "交渉中",
  "DD実施中",
  "契約締結",
  "完了",
  "中止",
];

export const PROJECT_PRIORITIES: ProjectPriority[] = ["高", "中", "低"];

export const COMPANY_ROLES = [
  "買収対象",
  "売却対象",
  "アドバイザー",
  "その他",
] as const;

// ---- Storage ----

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "projects.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
}

function readAll(): Project[] {
  ensureDataFile();
  return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Project[];
}

function writeAll(projects: Project[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(projects, null, 2), "utf-8");
}

// ---- CRUD ----

export function getAllProjects(): Project[] {
  return readAll();
}

export function getProject(id: string): Project | undefined {
  return readAll().find((p) => p.id === id);
}

export function createProject(input: ProjectInput): Project {
  const projects = readAll();
  const project: Project = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.push(project);
  writeAll(projects);
  return project;
}

export function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Project | null {
  const projects = readAll();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  projects[idx] = {
    ...projects[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  writeAll(projects);
  return projects[idx];
}

export function deleteProject(id: string): boolean {
  const projects = readAll();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return false;
  writeAll(filtered);
  return true;
}

export function getProjectsBySellerId(sellerId: string): Project[] {
  return readAll().filter((p) => p.sellerId === sellerId);
}

export function clearSellerFromProjects(sellerId: string): number {
  const projects = readAll();
  let changed = 0;
  const now = new Date().toISOString();
  for (const p of projects) {
    if (p.sellerId === sellerId) {
      p.sellerId = undefined;
      p.updatedAt = now;
      changed++;
    }
  }
  if (changed > 0) writeAll(projects);
  return changed;
}

// ---- Search ----

export function searchProjects(query?: string): Project[] {
  const all = readAll();
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
