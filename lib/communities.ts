import communitiesData from "@/data/communities.json";

// ---- Types ----
//
// d6e is the source of truth for community data — see
// `lib/d6e/repos/communities.ts` for read/write operations. The exports
// below only provide the type system used by the repo and the curated
// JSON dataset that the seeder (`scripts/seed-communities.ts`) loads
// into d6e.

export type CommunityType =
  | "経営者団体"
  | "業界団体"
  | "勉強会"
  | "交流会"
  | "オンライン"
  | "投資家コミュニティ"
  | "士業ネットワーク"
  | "アカデミア";

export interface Community {
  id: string;
  name: string;
  description: string;
  url?: string;
  prefecture?: string;
  type: CommunityType;
  memberCount?: number;
  focusAreas: string[];
  established?: number;
}

export const COMMUNITY_TYPES: readonly CommunityType[] = [
  "経営者団体",
  "業界団体",
  "勉強会",
  "交流会",
  "オンライン",
  "投資家コミュニティ",
  "士業ネットワーク",
  "アカデミア",
] as const;

export interface CommunityFilters {
  query?: string;
  prefecture?: string;
  type?: CommunityType;
  focusArea?: string;
  minMembers?: number;
  establishedFrom?: number;
  establishedTo?: number;
}

// ---- Seed data ----
// Used only by `scripts/seed-communities.ts` to bulk-insert into d6e.
// The runtime app reads from d6e via `lib/d6e/repos/communities.ts`,
// never from this array.

export const COMMUNITIES: Community[] = communitiesData as Community[];
