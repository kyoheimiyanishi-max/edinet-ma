import "server-only";

/**
 * Shared type guards for Japanese enum values that round-trip between
 * edinet-ma TypeScript unions and d6e CHECK-constrained text columns.
 *
 * d6e enforces these values at the DB level, but when a row is read
 * back as `{ foo: string }` the repo layer must narrow the string to
 * the TypeScript union before returning it. Using these guards instead
 * of `as SomeType` means an unexpected value logs a warning and falls
 * back to a safe default rather than silently corrupting downstream
 * logic.
 */

import { BANK_TYPES, type BankType } from "@/lib/banks";
import { COMMUNITY_TYPES, type CommunityType } from "@/lib/communities";
import { FP_TYPES, type FpType } from "@/lib/financial-planners";
import { MA_ADVISOR_TYPES, type MaAdvisorType } from "@/lib/ma-advisors";
import {
  CATEGORIES as PERSON_CATEGORIES,
  type PersonCategory,
} from "@/lib/people";
import {
  BUYER_STATUSES,
  MEDIATOR_TYPES,
  SELLER_RANKS,
  SELLER_STAGES,
  type BuyerStatus,
  type MediatorType,
  type SellerRank,
  type SellerStage,
} from "@/lib/sellers";
import { ADVISOR_TYPES, type AdvisorType } from "@/lib/tax-advisors";

/** Assert a value is one of `allowed` or fall back to `fallback` with a console warning. */
function narrow<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
  label: string,
): T {
  if (value === null || value === undefined) return fallback;
  if ((allowed as readonly string[]).includes(value)) return value as T;
  console.warn(
    `[d6e enum] unexpected ${label} value ${JSON.stringify(value)} — falling back to ${JSON.stringify(fallback)}`,
  );
  return fallback;
}

export function toBankType(v: string | null | undefined): BankType {
  return narrow(v, BANK_TYPES, "メガバンク", "BankType");
}

export function toAdvisorType(v: string | null | undefined): AdvisorType {
  return narrow(v, ADVISOR_TYPES, "税理士法人", "AdvisorType");
}

export function toPersonCategory(v: string | null | undefined): PersonCategory {
  return narrow(v, PERSON_CATEGORIES, "アドバイザー", "PersonCategory");
}

export function toCommunityType(v: string | null | undefined): CommunityType {
  return narrow(v, COMMUNITY_TYPES, "経営者団体", "CommunityType");
}

export function toFpType(v: string | null | undefined): FpType {
  return narrow(v, FP_TYPES, "独立系FP", "FpType");
}

export function toMaAdvisorType(v: string | null | undefined): MaAdvisorType {
  return narrow(v, MA_ADVISOR_TYPES, "仲介会社", "MaAdvisorType");
}

export function toSellerStage(v: string | null | undefined): SellerStage {
  return narrow(v, SELLER_STAGES, "初回面談", "SellerStage");
}

export function toBuyerStatus(v: string | null | undefined): BuyerStatus {
  return narrow(v, BUYER_STATUSES, "候補", "BuyerStatus");
}

/** Optional: null when DB value is missing or invalid (不明 = 未設定). */
export function toSellerRank(
  v: string | null | undefined,
): SellerRank | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if ((SELLER_RANKS as readonly string[]).includes(v)) return v as SellerRank;
  console.warn(`[d6e enum] unexpected SellerRank ${JSON.stringify(v)}`);
  return undefined;
}

export function toMediatorType(
  v: string | null | undefined,
): MediatorType | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if ((MEDIATOR_TYPES as readonly string[]).includes(v)) {
    return v as MediatorType;
  }
  console.warn(`[d6e enum] unexpected MediatorType ${JSON.stringify(v)}`);
  return undefined;
}

// ---- Internal-only enums (not exported from a user lib) ----

const LISTING_STATUS_VALUES = [
  "listed",
  "unlisted",
  "tokyo_prime",
  "tokyo_standard",
  "tokyo_growth",
  "other",
] as const;
export type ListingStatus = (typeof LISTING_STATUS_VALUES)[number];

export function toListingStatus(
  v: string | null | undefined,
): ListingStatus | undefined {
  if (v === null || v === undefined) return undefined;
  if ((LISTING_STATUS_VALUES as readonly string[]).includes(v)) {
    return v as ListingStatus;
  }
  console.warn(
    `[d6e enum] unexpected listing_status value ${JSON.stringify(v)} — returning undefined`,
  );
  return undefined;
}

const PROJECT_STATUS_VALUES = [
  "企画中",
  "調査中",
  "交渉中",
  "DD実施中",
  "契約締結",
  "完了",
  "中止",
] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];

export function toProjectStatus(
  v: string | null | undefined,
): ProjectStatusValue {
  return narrow(v, PROJECT_STATUS_VALUES, "企画中", "ProjectStatus");
}

const PROJECT_PRIORITY_VALUES = ["低", "中", "高"] as const;
export type ProjectPriorityValue = (typeof PROJECT_PRIORITY_VALUES)[number];

export function toProjectPriority(
  v: string | null | undefined,
): ProjectPriorityValue {
  return narrow(v, PROJECT_PRIORITY_VALUES, "中", "ProjectPriority");
}

const ASSIGNMENT_ROLE_VALUES = ["主担当", "副担当", "サポート"] as const;
export type AssignmentRoleValue = (typeof ASSIGNMENT_ROLE_VALUES)[number];

export function toAssignmentRole(
  v: string | null | undefined,
): AssignmentRoleValue {
  return narrow(v, ASSIGNMENT_ROLE_VALUES, "主担当", "AssignmentRole");
}

const ASSIGNMENT_STATUS_VALUES = ["アクティブ", "フォロー中", "完了"] as const;
export type AssignmentStatusValue = (typeof ASSIGNMENT_STATUS_VALUES)[number];

export function toAssignmentStatus(
  v: string | null | undefined,
): AssignmentStatusValue {
  return narrow(v, ASSIGNMENT_STATUS_VALUES, "アクティブ", "AssignmentStatus");
}

const BUYER_SOURCE_VALUES = ["ai", "manual"] as const;
export type BuyerSourceValue = (typeof BUYER_SOURCE_VALUES)[number];

export function toBuyerSource(v: string | null | undefined): BuyerSourceValue {
  return narrow(v, BUYER_SOURCE_VALUES, "manual", "BuyerSource");
}
