import peopleData from "@/data/people.json";

// ---- Types ----

export interface PersonLink {
  label: string;
  url: string;
}

export type PersonCategory =
  | "アドバイザー"
  | "投資家"
  | "経営者"
  | "アクティビスト"
  | "専門家";

export interface Person {
  id: string;
  name: string;
  nameEn?: string;
  role: string;
  organization: string;
  description: string;
  category: PersonCategory;
  notableDeals: string[];
  links: PersonLink[];
}

export const CATEGORIES: readonly PersonCategory[] = [
  "アドバイザー",
  "投資家",
  "経営者",
  "アクティビスト",
  "専門家",
] as const;

// ---- Data ----

export const MA_PEOPLE: Person[] = peopleData as Person[];

// ---- Search ----

export interface PeopleFilters {
  query?: string;
  category?: string;
  organization?: string;
  deal?: string;
  hasLinks?: boolean;
}

export function searchPeople(
  queryOrFilters?: string | PeopleFilters,
  category?: string,
): Person[] {
  const filters: PeopleFilters =
    typeof queryOrFilters === "object"
      ? queryOrFilters
      : { query: queryOrFilters, category };

  let results: Person[] = MA_PEOPLE;

  if (filters.category) {
    results = results.filter((p) => p.category === filters.category);
  }

  if (filters.organization) {
    const org = filters.organization.toLowerCase();
    results = results.filter((p) => p.organization.toLowerCase().includes(org));
  }

  if (filters.deal) {
    const deal = filters.deal.toLowerCase();
    results = results.filter((p) =>
      p.notableDeals.some((d) => d.toLowerCase().includes(deal)),
    );
  }

  if (filters.hasLinks) {
    results = results.filter((p) => p.links && p.links.length > 0);
  }

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
        p.organization.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.notableDeals.some((d) => d.toLowerCase().includes(q)),
    );
  }

  return results;
}

export function getAllOrganizations(): string[] {
  return Array.from(new Set(MA_PEOPLE.map((p) => p.organization))).sort();
}

export function getAllNotableDeals(): string[] {
  const set = new Set<string>();
  for (const p of MA_PEOPLE) {
    for (const d of p.notableDeals) set.add(d);
  }
  return Array.from(set).sort();
}

// ---- Helpers ----

export function getPeopleByCategory(category: PersonCategory): Person[] {
  return MA_PEOPLE.filter((p) => p.category === category);
}

export function getAllCategories(): PersonCategory[] {
  return [...new Set(MA_PEOPLE.map((p) => p.category))];
}
