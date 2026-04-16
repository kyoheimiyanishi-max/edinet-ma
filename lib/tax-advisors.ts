import advisorsData from "@/data/tax-advisors.json";

import type { AllianceContactStatus } from "./alliance-contact-status";

// ---- Types ----
//
// d6e is the source of truth for tax advisors data — see
// `lib/d6e/repos/tax-advisors.ts` for read/write operations. The exports
// below only provide the type system used by the repo and the curated
// JSON dataset that the seeder (`scripts/seed-tax-advisors.ts`) loads
// into d6e.

export type AdvisorType =
  | "税理士法人"
  | "会計事務所"
  | "Big4"
  | "FAS"
  | "個人税理士"
  | "M&A特化";

export interface TaxAdvisor {
  id: string;
  name: string;
  type: AdvisorType;
  description: string;
  specialties: string[];
  prefecture?: string;
  url?: string;
  size?: string;
  notableServices?: string[];
  contactStatus: AllianceContactStatus;
}

export const ADVISOR_TYPES: readonly AdvisorType[] = [
  "税理士法人",
  "会計事務所",
  "Big4",
  "FAS",
  "個人税理士",
  "M&A特化",
] as const;

export interface AdvisorFilters {
  query?: string;
  type?: AdvisorType;
  prefecture?: string;
  specialty?: string;
  size?: string;
  contactStatus?: AllianceContactStatus;
}

// ---- Seed data ----
// Used only by `scripts/seed-tax-advisors.ts` to bulk-insert into d6e.
// The runtime app reads from d6e via `lib/d6e/repos/tax-advisors.ts`,
// never from this array.

export const ADVISORS: TaxAdvisor[] = advisorsData as TaxAdvisor[];
