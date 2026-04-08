import peopleData from "@/data/people.json";

// ---- Types ----
//
// d6e is the source of truth for people data — see
// `lib/d6e/repos/people.ts` for read/write operations. The exports
// below only provide the type system used by the repo and the curated
// JSON dataset that the seeder (`scripts/seed-people.ts`) loads into
// d6e.

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

export interface PeopleFilters {
  query?: string;
  category?: string;
  organization?: string;
  deal?: string;
  hasLinks?: boolean;
}

// ---- Seed data ----
// Used only by `scripts/seed-people.ts` to bulk-insert into d6e. The
// runtime app reads from d6e via `lib/d6e/repos/people.ts`, never from
// this array.

export const MA_PEOPLE: Person[] = peopleData as Person[];
