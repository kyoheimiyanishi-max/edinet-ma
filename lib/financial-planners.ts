import plannersData from "@/data/financial-planners.json";

import type { AllianceContactStatus } from "./alliance-contact-status";

// ---- Types ----
//
// d6e is the source of truth for financial-planner data — see
// `lib/d6e/repos/financial-planners.ts` for read/write operations. The
// exports below only provide the type system used by the repo and the
// curated JSON dataset that the seeder loads into d6e.

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
  contactStatus: AllianceContactStatus;
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
  contactStatus?: AllianceContactStatus;
}

// ---- Seed data ----
// Used only by `scripts/seed-financial-planners.ts` to bulk-insert into
// d6e. The runtime app reads from d6e via
// `lib/d6e/repos/financial-planners.ts`, never from this array.

export const FINANCIAL_PLANNERS: FinancialPlanner[] =
  plannersData as FinancialPlanner[];
