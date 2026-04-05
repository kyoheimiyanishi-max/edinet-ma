const OPENALEX_BASE = "https://api.openalex.org/works";

// ---- Types ----

export interface PaperAuthor {
  name: string;
  institution: string | null;
}

export interface PaperResult {
  title: string;
  authors: PaperAuthor[];
  year: number | null;
  citationCount: number;
  doi: string | null;
  url: string;
  abstract: string | null;
}

interface OpenAlexAuthorship {
  author?: { display_name?: string };
  institutions?: Array<{ display_name?: string }>;
}

interface OpenAlexWork {
  title?: string;
  display_name?: string;
  authorships?: OpenAlexAuthorship[];
  publication_year?: number;
  cited_by_count?: number;
  doi?: string;
  id?: string;
  abstract_inverted_index?: Record<string, number[]>;
}

interface OpenAlexResponse {
  results?: OpenAlexWork[];
  meta?: { count?: number; per_page?: number; page?: number };
}

// ---- Fetch ----

export async function searchPapers(
  query: string,
  page?: number,
): Promise<PaperResult[]> {
  if (!query) return [];

  try {
    const params = new URLSearchParams({
      search: query,
      per_page: "20",
      sort: "cited_by_count:desc",
      mailto: "edinet-ma@example.com",
    });
    if (page && page > 1) params.set("page", String(page));

    const res = await fetch(`${OPENALEX_BASE}?${params}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data: OpenAlexResponse = await res.json();
    return (data.results || []).map(mapWork);
  } catch {
    return [];
  }
}

// ---- Mapping ----

function mapWork(work: OpenAlexWork): PaperResult {
  return {
    title: work.display_name || work.title || "",
    authors: (work.authorships || []).map((a) => ({
      name: a.author?.display_name || "",
      institution: a.institutions?.[0]?.display_name || null,
    })),
    year: work.publication_year ?? null,
    citationCount: work.cited_by_count ?? 0,
    doi: work.doi || null,
    url: work.doi || work.id || "",
    abstract: reconstructAbstract(work.abstract_inverted_index),
  };
}

function reconstructAbstract(
  invertedIndex: Record<string, number[]> | undefined | null,
): string | null {
  if (!invertedIndex) return null;

  const words: Array<{ position: number; word: string }> = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push({ position: pos, word });
    }
  }

  words.sort((a, b) => a.position - b.position);
  return words.map((w) => w.word).join(" ") || null;
}

// ---- Helpers ----

export function getCiNiiUrl(query: string): string {
  return `https://cir.nii.ac.jp/all?q=${encodeURIComponent(query)}&lang=ja`;
}

export function getDoiUrl(doi: string): string {
  if (doi.startsWith("http")) return doi;
  return `https://doi.org/${doi}`;
}
