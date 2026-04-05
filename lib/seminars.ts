const CONNPASS_BASE = "https://connpass.com/api/v1/event/";

// Multiple search keywords for broader coverage
const DEFAULT_KEYWORDS = [
  "M&A",
  "事業承継",
  "企業買収",
  "経営者 セミナー",
  "スタートアップ 資金調達",
  "IPO 上場",
  "PMI 統合",
  "デューデリジェンス",
  "バリュエーション 企業価値",
  "PE ファンド",
];

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

interface ConnpassResponse {
  results_returned: number;
  results_available: number;
  results_start: number;
  events: ConnpassEvent[];
}

interface ConnpassEvent {
  event_id?: number;
  title?: string;
  catch?: string;
  description?: string;
  event_url?: string;
  started_at?: string;
  ended_at?: string;
  place?: string;
  address?: string;
  owner_display_name?: string;
  accepted?: number;
  limit?: number | null;
  event_type?: string;
}

// ---- Fetch ----

export async function searchSeminars(
  keyword?: string,
): Promise<SeminarEvent[]> {
  if (keyword) {
    // Custom search: single keyword
    return fetchSingleKeyword(keyword, keyword);
  }

  // Default: aggregate from all keywords in parallel
  const results = await Promise.allSettled(
    DEFAULT_KEYWORDS.map((kw) => fetchSingleKeyword(kw, kw)),
  );

  const allEvents: SeminarEvent[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allEvents.push(...result.value);
    }
  }

  // Deduplicate by event_id
  const seen = new Set<number>();
  const unique = allEvents.filter((event) => {
    if (seen.has(event.event_id)) return false;
    seen.add(event.event_id);
    return true;
  });

  // Sort by date (upcoming first)
  unique.sort((a, b) => {
    const da = new Date(a.started_at).getTime() || 0;
    const db = new Date(b.started_at).getTime() || 0;
    return da - db;
  });

  // Prioritize upcoming events
  const now = Date.now();
  const upcoming = unique.filter((e) => new Date(e.started_at).getTime() > now);
  const past = unique.filter((e) => new Date(e.started_at).getTime() <= now);

  return [...upcoming, ...past].slice(0, 100);
}

async function fetchSingleKeyword(
  keyword: string,
  category: string,
): Promise<SeminarEvent[]> {
  try {
    const params = new URLSearchParams({
      keyword,
      count: "20",
      order: "2",
    });

    const res = await fetch(`${CONNPASS_BASE}?${params}`, {
      next: { revalidate: 1800 },
    });

    if (!res.ok) return [];

    const data: ConnpassResponse = await res.json();
    return (data.events || []).map((e) => mapEvent(e, category));
  } catch {
    return [];
  }
}

// ---- Mapping ----

function mapEvent(event: ConnpassEvent, category: string): SeminarEvent {
  return {
    event_id: event.event_id ?? 0,
    title: event.title || "",
    catch: event.catch || "",
    description: event.description || "",
    event_url: event.event_url || "",
    started_at: event.started_at || "",
    ended_at: event.ended_at || "",
    place: event.place || "",
    address: event.address || "",
    owner_display_name: event.owner_display_name || "",
    accepted: event.accepted ?? 0,
    limit: event.limit ?? null,
    event_type: event.event_type || "",
    category,
  };
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
      return "参��型";
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
    "経営者 セミナー": "bg-purple-100 text-purple-700",
    "スタートアップ 資金調達": "bg-emerald-100 text-emerald-700",
    "IPO 上場": "bg-indigo-100 text-indigo-700",
    "PMI 統合": "bg-cyan-100 text-cyan-700",
    デューデリジェンス: "bg-rose-100 text-rose-700",
    "バリュエーション 企業価値": "bg-orange-100 text-orange-700",
    "PE ファンド": "bg-violet-100 text-violet-700",
  };
  return colors[category] || "bg-slate-100 text-slate-600";
}
