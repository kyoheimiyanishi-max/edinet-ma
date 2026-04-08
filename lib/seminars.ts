import seminarsData from "@/data/seminars.json";

// ---- Types ----

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
}

const ALL_SEMINARS: SeminarEvent[] = seminarsData as SeminarEvent[];

// ---- Search ----

export async function searchSeminars(
  keyword?: string,
): Promise<SeminarEvent[]> {
  let results = ALL_SEMINARS;

  if (keyword && keyword.trim()) {
    const q = keyword.trim().toLowerCase();
    results = results.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.catch.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.owner_display_name.toLowerCase().includes(q),
    );
  }

  // Sort: upcoming first by date asc, then past by date desc
  const now = Date.now();
  const sorted = [...results].sort((a, b) => {
    const da = new Date(a.started_at).getTime() || 0;
    const db = new Date(b.started_at).getTime() || 0;
    const aFuture = da > now;
    const bFuture = db > now;
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    if (aFuture) return da - db;
    return db - da;
  });

  return sorted;
}

// ---- Helpers ----

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
