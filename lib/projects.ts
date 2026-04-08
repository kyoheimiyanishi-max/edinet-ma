// ---- Types ----
//
// d6e is the source of truth for project data — see
// `lib/d6e/repos/projects.ts` for read/write operations. The exports
// below only provide the type system used by the repo and route handlers.

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
