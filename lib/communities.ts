import communitiesData from "@/data/communities.json";

// ---- Types ----

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

// ---- Data ----

export const COMMUNITIES: Community[] = communitiesData as Community[];

// ---- Search ----

export interface CommunityFilters {
  query?: string;
  prefecture?: string;
  type?: CommunityType;
  focusArea?: string;
  minMembers?: number;
  establishedFrom?: number;
  establishedTo?: number;
}

export function searchCommunities(
  queryOrFilters?: string | CommunityFilters,
  prefecture?: string,
): Community[] {
  const filters: CommunityFilters =
    typeof queryOrFilters === "object"
      ? queryOrFilters
      : { query: queryOrFilters, prefecture };

  let results: Community[] = COMMUNITIES;

  if (filters.prefecture) {
    results = results.filter((c) => c.prefecture === filters.prefecture);
  }

  if (filters.type) {
    results = results.filter((c) => c.type === filters.type);
  }

  if (filters.focusArea) {
    const f = filters.focusArea.toLowerCase();
    results = results.filter((c) =>
      c.focusAreas.some((a) => a.toLowerCase().includes(f)),
    );
  }

  if (filters.minMembers != null) {
    results = results.filter(
      (c) => c.memberCount != null && c.memberCount >= filters.minMembers!,
    );
  }

  if (filters.establishedFrom != null) {
    results = results.filter(
      (c) => c.established != null && c.established >= filters.establishedFrom!,
    );
  }

  if (filters.establishedTo != null) {
    results = results.filter(
      (c) => c.established != null && c.established <= filters.establishedTo!,
    );
  }

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.focusAreas.some((f) => f.toLowerCase().includes(q)),
    );
  }

  return results;
}

export function getAllFocusAreas(): string[] {
  const set = new Set<string>();
  for (const c of COMMUNITIES) {
    for (const f of c.focusAreas) set.add(f);
  }
  return Array.from(set).sort();
}

// ---- Helpers ----

export function getCommunitiesByType(type: CommunityType): Community[] {
  return COMMUNITIES.filter((c) => c.type === type);
}

export function getCommunitiesByPrefecture(prefecture: string): Community[] {
  return COMMUNITIES.filter((c) => c.prefecture === prefecture);
}

export function getAllTypes(): CommunityType[] {
  return [...new Set(COMMUNITIES.map((c) => c.type))];
}

export function getAllPrefectures(): string[] {
  return [
    ...new Set(
      COMMUNITIES.filter((c) => c.prefecture).map(
        (c) => c.prefecture as string,
      ),
    ),
  ];
}
