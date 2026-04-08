import advisorsData from "@/data/ma-advisors.json";

// ---- Types ----

export type MaAdvisorType =
  | "仲介会社"
  | "ブティック"
  | "総合系"
  | "クロスボーダー"
  | "地域特化";

export interface MaAdvisor {
  id: string;
  name: string;
  type: MaAdvisorType;
  description: string;
  services: string[];
  prefecture?: string;
  url?: string;
  listed?: boolean;
  targetSize?: string;
}

export const MA_ADVISOR_TYPES: readonly MaAdvisorType[] = [
  "仲介会社",
  "ブティック",
  "総合系",
  "クロスボーダー",
  "地域特化",
] as const;

export interface MaAdvisorFilters {
  query?: string;
  type?: MaAdvisorType;
  prefecture?: string;
  service?: string;
  listedOnly?: boolean;
  targetSize?: string;
}

// ---- Dataset ----

export const MA_ADVISORS: MaAdvisor[] = advisorsData as MaAdvisor[];

// ---- Search ----

export function searchMaAdvisors(filters: MaAdvisorFilters = {}): MaAdvisor[] {
  let results = [...MA_ADVISORS];

  if (filters.type) {
    results = results.filter((a) => a.type === filters.type);
  }
  if (filters.prefecture) {
    results = results.filter((a) => a.prefecture === filters.prefecture);
  }
  if (filters.service) {
    const sv = filters.service.toLowerCase();
    results = results.filter((a) =>
      a.services.some((s) => s.toLowerCase().includes(sv)),
    );
  }
  if (filters.listedOnly) {
    results = results.filter((a) => a.listed === true);
  }
  if (filters.targetSize) {
    results = results.filter((a) => a.targetSize === filters.targetSize);
  }
  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.services.some((s) => s.toLowerCase().includes(q)),
    );
  }

  return results.sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

export function getAllMaAdvisorServices(): string[] {
  const set = new Set<string>();
  for (const a of MA_ADVISORS) {
    for (const s of a.services) set.add(s);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ja"));
}

export function getAllMaAdvisorTargetSizes(): string[] {
  const set = new Set<string>();
  for (const a of MA_ADVISORS) {
    if (a.targetSize) set.add(a.targetSize);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ja"));
}

export function getPresentMaAdvisorTypes(): MaAdvisorType[] {
  const present = new Set(MA_ADVISORS.map((a) => a.type));
  return MA_ADVISOR_TYPES.filter((t) => present.has(t));
}
