import banksData from "@/data/banks.json";

import type { AllianceContactStatus } from "./alliance-contact-status";

// ---- Types ----
//
// d6e is now the source of truth for banks data — see
// `lib/d6e/repos/banks.ts` for read/write operations. The exports below
// only provide the type system used by the repo and the curated JSON
// dataset that the seeder (`scripts/seed-banks.ts`) loads into d6e.

export type BankType =
  | "メガバンク"
  | "地方銀行"
  | "信託銀行"
  | "政策金融"
  | "証券会社"
  | "投資銀行"
  | "ノンバンク"
  | "信用金庫";

export interface Bank {
  id: string;
  name: string;
  type: BankType;
  description: string;
  maServices: string[];
  prefecture?: string;
  url?: string;
  totalAssets?: string;
  maTeam?: string;
  contactStatus: AllianceContactStatus;
}

export const BANK_TYPES: readonly BankType[] = [
  "メガバンク",
  "地方銀行",
  "信託銀行",
  "政策金融",
  "証券会社",
  "投資銀行",
  "ノンバンク",
  "信用金庫",
] as const;

export interface BankFilters {
  query?: string;
  type?: BankType;
  prefecture?: string;
  service?: string;
  hasMaTeam?: boolean;
  contactStatus?: AllianceContactStatus;
}

// ---- Seed data ----
// Used only by `scripts/seed-banks.ts` to bulk-insert into d6e. The
// runtime app reads from d6e via `lib/d6e/repos/banks.ts`, never from
// this array.

export const BANKS: Bank[] = banksData as Bank[];
