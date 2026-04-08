// Market segment & cap lookup by security code (kabutan scraping fallback)

const PRIME_CODES = new Set<string>(); // populated at runtime via scraping fallback
const STANDARD_CODES = new Set<string>();
const GROWTH_CODES = new Set<string>();

const MARKET_CAP_CACHE = new Map<string, number | null>();

const KABUTAN_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; EDINET-MA/1.0; +https://edinet-ma.example.com)",
};

async function fetchKabutanHtml(code: string): Promise<string | null> {
  try {
    const res = await fetch(`https://kabutan.jp/stock/?code=${code}`, {
      next: { revalidate: 86400 },
      headers: KABUTAN_HEADERS,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Scrape 時価総額 (market cap, in JPY) from kabutan.
 * Returns null when the value is not present or unparseable.
 */
export async function fetchMarketCap(
  secCode: string | undefined,
): Promise<number | null> {
  if (!secCode) return null;
  const code = secCode.replace(/0$/, "");

  if (MARKET_CAP_CACHE.has(code)) {
    return MARKET_CAP_CACHE.get(code) ?? null;
  }

  const html = await fetchKabutanHtml(code);
  if (!html) {
    MARKET_CAP_CACHE.set(code, null);
    return null;
  }

  // Match: 時価総額</th> <td>1,619<span>億円</span>
  // Be lenient about whitespace and intervening attributes.
  const m = html.match(
    /時価総額[\s\S]{0,150}?([\d,]+)\s*<span>\s*(億円|百万円)/,
  );
  if (!m) {
    MARKET_CAP_CACHE.set(code, null);
    return null;
  }

  const num = parseInt(m[1].replace(/,/g, ""), 10);
  if (!Number.isFinite(num)) {
    MARKET_CAP_CACHE.set(code, null);
    return null;
  }

  const yen = m[2] === "億円" ? num * 100_000_000 : num * 1_000_000;
  MARKET_CAP_CACHE.set(code, yen);
  return yen;
}

// We can't scrape JPX in real-time, so we use a heuristic:
// - Securities codes starting with 1-4 digit codes
// - Large caps (sec_code < 4000) tend to be Prime
// - This is approximate; for accuracy we fetch from kabutan

export async function fetchMarketSegment(
  secCode: string | undefined,
): Promise<string | null> {
  if (!secCode) return null;

  const code = secCode.replace(/0$/, ""); // Remove trailing 0

  // Check cache
  if (PRIME_CODES.has(code)) return "プライム";
  if (STANDARD_CODES.has(code)) return "スタンダード";
  if (GROWTH_CODES.has(code)) return "グロース";

  try {
    // Scrape kabutan for market segment
    const res = await fetch(`https://kabutan.jp/stock/?code=${code}`, {
      next: { revalidate: 86400 }, // Cache for 24h
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EDINET-MA/1.0; +https://edinet-ma.example.com)",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Look for market segment in the HTML
    if (html.includes("プライム")) {
      PRIME_CODES.add(code);
      return "プライム";
    }
    if (html.includes("スタンダード")) {
      STANDARD_CODES.add(code);
      return "スタンダード";
    }
    if (html.includes("グロース")) {
      GROWTH_CODES.add(code);
      return "グロース";
    }

    // Check for other exchanges
    if (html.includes("東証")) return "東証";
    if (html.includes("札証")) return "札証";
    if (html.includes("名証")) return "名証";
    if (html.includes("福証")) return "福証";

    return null;
  } catch {
    return null;
  }
}
