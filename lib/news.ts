// ---- Multiple RSS Sources for M&A News ----

const RSS_FEEDS = [
  {
    url: "https://news.google.com/rss/search?q=M%26A+%E8%B2%B7%E5%8F%8E&hl=ja&gl=JP&ceid=JP:ja",
    label: "M&A 買収",
  },
  {
    url: "https://news.google.com/rss/search?q=%E5%90%88%E4%BD%B5+%E7%B5%B1%E5%90%88+%E4%BC%81%E6%A5%AD&hl=ja&gl=JP&ceid=JP:ja",
    label: "合併 統合",
  },
  {
    url: "https://news.google.com/rss/search?q=%E4%BA%8B%E6%A5%AD%E6%89%BF%E7%B6%99+%E5%A3%B2%E5%8D%B4&hl=ja&gl=JP&ceid=JP:ja",
    label: "事業承継 売却",
  },
  {
    url: "https://news.google.com/rss/search?q=TOB+%E5%85%AC%E9%96%8B%E8%B2%B7%E4%BB%98&hl=ja&gl=JP&ceid=JP:ja",
    label: "TOB 公開買付",
  },
  {
    url: "https://news.google.com/rss/search?q=%E5%A4%A7%E9%87%8F%E4%BF%9D%E6%9C%89+%E6%A0%AA%E5%BC%8F%E5%8F%96%E5%BE%97&hl=ja&gl=JP&ceid=JP:ja",
    label: "大量保有 株式取得",
  },
  {
    url: "https://news.google.com/rss/search?q=%E3%82%A2%E3%82%AF%E3%83%86%E3%82%A3%E3%83%93%E3%82%B9%E3%83%88+%E7%89%A9%E8%A8%80%E3%81%86%E6%A0%AA%E4%B8%BB&hl=ja&gl=JP&ceid=JP:ja",
    label: "アクティビスト",
  },
  {
    url: "https://news.google.com/rss/search?q=MBO+%E7%B5%8C%E5%96%B6%E9%99%A3%E8%B2%B7%E5%8F%8E&hl=ja&gl=JP&ceid=JP:ja",
    label: "MBO 経営陣買��",
  },
  {
    url: "https://news.google.com/rss/search?q=%E3%82%AF%E3%83%AD%E3%82%B9%E3%83%9C%E3%83%BC%E3%83%80%E3%83%BCM%26A+%E6%B5%B7%E5%A4%96%E8%B2%B7%E5%8F%8E&hl=ja&gl=JP&ceid=JP:ja",
    label: "クロスボーダーM&A",
  },
];

// ---- Types ----

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
}

// ---- Fetch ----

export async function searchNews(query?: string): Promise<NewsItem[]> {
  if (query) {
    // Custom query: single Google News RSS search
    return fetchSingleFeed(
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`,
      query,
    );
  }

  // Default: aggregate from all feeds in parallel
  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchSingleFeed(feed.url, feed.label)),
  );

  const allItems: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Deduplicate by title similarity
  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    const key = normalizeTitle(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date (newest first)
  unique.sort((a, b) => {
    const da = new Date(a.pubDate).getTime() || 0;
    const db = new Date(b.pubDate).getTime() || 0;
    return db - da;
  });

  return unique.slice(0, 100);
}

async function fetchSingleFeed(
  url: string,
  category: string,
): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, category);
  } catch {
    return [];
  }
}

// ---- RSS Parser (regex, no external deps) ----

function parseRssItems(xml: string, category: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const source = extractTag(block, "source");

    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title),
        link,
        pubDate: pubDate || "",
        source: source || "",
        category,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(
    `<${tag}[^>]*>(!?\\[CDATA\\[)?(.*?)(\\]\\])?<\\/${tag}>`,
    "s",
  );
  const match = regex.exec(xml);
  if (!match) return null;
  return match[2].trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, "").toLowerCase().slice(0, 40);
}

// ---- Helpers ----

export function formatPubDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}

export function getNewsCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    "M&A 買収": "bg-blue-100 text-blue-700",
    "合併 統合": "bg-purple-100 text-purple-700",
    "事��承継 売却": "bg-amber-100 text-amber-700",
    "TOB 公開買付": "bg-red-100 text-red-700",
    "大量保有 ��式取得": "bg-indigo-100 text-indigo-700",
    アクティビスト: "bg-rose-100 text-rose-700",
    "MBO 経営陣買収": "bg-emerald-100 text-emerald-700",
    "クロスボーダーM&A": "bg-cyan-100 text-cyan-700",
  };
  return colors[category] || "bg-slate-100 text-slate-600";
}
