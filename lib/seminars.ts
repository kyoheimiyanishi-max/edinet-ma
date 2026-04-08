import seminarsData from "@/data/seminars.json";

// ---- Types ----
//
// d6e is the source of truth for seminars data — see
// `lib/d6e/repos/seminars.ts` for read/write operations. The exports
// below provide the type system, display helpers, and the curated JSON
// dataset that the seeder (`scripts/seed-seminars.ts`) loads into d6e.

export interface SeminarEvent {
  event_id: number;
  title: string;
  catch: string;
  description: string;
  event_url: string;
  started_at: string;
  ended_at: string;
  place: string;
  address: string;
  owner_display_name: string;
  accepted: number;
  limit: number | null;
  event_type: string;
  category: string;
  /** Content-derived tags. Multiple tags per seminar. */
  tags?: string[];
}

/** タグの公式リスト。フィルター UI で表示順を保つために配列で管理。 */
export const SEMINAR_TAGS = [
  "M&A",
  "事業承継",
  "PMI",
  "デューデリジェンス",
  "バリュエーション",
  "PE・ファンド",
  "VC・ベンチャー投資",
  "IPO・上場",
  "TOB・公開買付",
  "MBO",
  "カーブアウト",
  "クロスボーダー",
  "スタートアップ",
  "資金調達",
  "経営戦略",
  "ガバナンス",
  "DX",
  "財務・会計",
  "税務",
  "法務",
  "人事・組織",
  "マーケティング",
] as const;

export type SeminarTag = (typeof SEMINAR_TAGS)[number];

export interface SeminarFilters {
  query?: string;
  /** Match seminars whose tags include ANY of the specified tags. */
  tags?: string[];
  /** When true, require ALL specified tags. */
  matchAllTags?: boolean;
}

// ---- Seed data ----
// Used only by `scripts/seed-seminars.ts` to bulk-insert into d6e. The
// runtime app reads from d6e via `lib/d6e/repos/seminars.ts`, never
// from this array.

export const ALL_SEMINARS: SeminarEvent[] = seminarsData as SeminarEvent[];

// ---- Display helpers ----

export function formatEventDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
  } catch {
    return dateStr;
  }
}

export function formatCapacity(accepted: number, limit: number | null): string {
  if (limit == null) return `${accepted}人`;
  return `${accepted}/${limit}人`;
}

export function isUpcoming(dateStr: string): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr).getTime() > Date.now();
  } catch {
    return false;
  }
}

export function eventTypeLabel(type: string): string {
  switch (type) {
    case "participation":
      return "参加型";
    case "advertisement":
      return "告知型";
    default:
      return type;
  }
}

export function getSeminarCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "M&A": "bg-blue-100 text-blue-700",
    事業承継: "bg-amber-100 text-amber-700",
    企業買収: "bg-red-100 text-red-700",
    経営者向け: "bg-purple-100 text-purple-700",
    スタートアップ: "bg-emerald-100 text-emerald-700",
    "IPO・上場": "bg-indigo-100 text-indigo-700",
    PMI: "bg-cyan-100 text-cyan-700",
    デューデリジェンス: "bg-rose-100 text-rose-700",
    バリュエーション: "bg-orange-100 text-orange-700",
    "PE・ファンド": "bg-violet-100 text-violet-700",
    "DX・経営": "bg-teal-100 text-teal-700",
    その他: "bg-slate-100 text-slate-600",
  };
  return colors[category] || "bg-slate-100 text-slate-600";
}
