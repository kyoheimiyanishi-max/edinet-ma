import advisorsData from "@/data/ma-advisors.json";

import type { AllianceContactStatus } from "./alliance-contact-status";

// ---- Types ----
//
// d6e is the source of truth for M&A advisor data — see
// `lib/d6e/repos/ma-advisors.ts` for read/write operations. The exports
// below only provide the type system used by the repo and the curated
// JSON dataset that the seeder loads into d6e.

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
  contactStatus: AllianceContactStatus;
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
  contactStatus?: AllianceContactStatus;
}

// ---- Seed data ----
// Used only by `scripts/seed-ma-advisors.ts` to bulk-insert into d6e.
// The runtime app reads from d6e via `lib/d6e/repos/ma-advisors.ts`,
// never from this array.

export const MA_ADVISORS: MaAdvisor[] = advisorsData as MaAdvisor[];
