import plannersData from "@/data/financial-planners.json";

// ---- Types ----

export type FpType =
  | "独立系FP"
  | "IFA"
  | "保険系FP"
  | "銀行系FP"
  | "ロボアド"
  | "FP事務所";

export interface FinancialPlanner {
  id: string;
  name: string;
  type: FpType;
  description: string;
  services: string[];
  certifications?: string[];
  targetClients?: string;
  prefecture?: string;
  url?: string;
  listed?: boolean;
}

export const FP_TYPES: readonly FpType[] = [
  "独立系FP",
  "IFA",
  "保険系FP",
  "銀行系FP",
  "ロボアド",
  "FP事務所",
] as const;

export interface FpFilters {
  query?: string;
  type?: FpType;
  prefecture?: string;
  service?: string;
  listedOnly?: boolean;
  targetClients?: string;
}

// ---- Dataset ----

export const FINANCIAL_PLANNERS: FinancialPlanner[] =
  plannersData as FinancialPlanner[];

// ---- Search ----

export function searchFinancialPlanners(
  filters: FpFilters = {},
): FinancialPlanner[] {
  let results = [...FINANCIAL_PLANNERS];

  if (filters.type) {
    results = results.filter((p) => p.type === filters.type);
  }
  if (filters.prefecture) {
    results = results.filter((p) => p.prefecture === filters.prefecture);
  }
  if (filters.service) {
    const sv = filters.service.toLowerCase();
    results = results.filter((p) =>
      p.services.some((s) => s.toLowerCase().includes(sv)),
    );
  }
  if (filters.listedOnly) {
    results = results.filter((p) => p.listed === true);
  }
  if (filters.targetClients) {
    const tc = filters.targetClients.toLowerCase();
    results = results.filter(
      (p) =>
        p.targetClients !== undefined &&
        p.targetClients.toLowerCase().includes(tc),
    );
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.services.some((s) => s.toLowerCase().includes(q)) ||
        (p.certifications
          ? p.certifications.some((c) => c.toLowerCase().includes(q))
          : false),
    );
  }

  return results.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export function getAllFpServices(): string[] {
  const set = new Set<string>();
  for (const p of FINANCIAL_PLANNERS) {
    for (const s of p.services) set.add(s);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ja"));
}

export function getAllFpTargetClients(): string[] {
  const set = new Set<string>();
  for (const p of FINANCIAL_PLANNERS) {
    if (p.targetClients) set.add(p.targetClients);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ja"));
}

export function getPresentFpTypes(): FpType[] {
  const present = new Set(FINANCIAL_PLANNERS.map((p) => p.type));
  return FP_TYPES.filter((t) => present.has(t));
}
