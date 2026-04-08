// ---- Types ----
//
// d6e is the source of truth for employee data — see
// `lib/d6e/repos/employees.ts` for read/write operations. The exports
// below only provide the type system used by the repo and route handlers.

export interface CompanyAssignment {
  companyCode: string;
  companyName: string;
  role: "主担当" | "副担当" | "サポート";
  status: "アクティブ" | "フォロー中" | "完了";
  note: string;
  assignedAt: string;
}

export interface KPI {
  id: string;
  period: string; // YYYY-MM
  metric: string;
  target: number;
  actual: number;
  unit: string;
  note: string;
  updatedAt: string;
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
  kpis: KPI[];
}

export type EmployeeInput = Omit<
  Employee,
  "id" | "createdAt" | "assignments" | "kpis"
>;

export type KpiInput = Omit<KPI, "id" | "updatedAt">;

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

export const KPI_PRESETS: ReadonlyArray<{ metric: string; unit: string }> = [
  { metric: "新規開拓数", unit: "件" },
  { metric: "面談数", unit: "件" },
  { metric: "提案数", unit: "件" },
  { metric: "受託件数", unit: "件" },
  { metric: "成約件数", unit: "件" },
  { metric: "受託金額", unit: "円" },
  { metric: "売上金額", unit: "円" },
  { metric: "担当企業数", unit: "社" },
];
