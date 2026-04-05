// Market segment lookup by security code
// Based on JPX listing segments as of 2024

const PRIME_CODES = new Set<string>(); // populated at runtime via scraping fallback
const STANDARD_CODES = new Set<string>();
const GROWTH_CODES = new Set<string>();

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
