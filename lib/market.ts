// Market segment & cap lookup by security code (kabutan scraping fallback)

const MARKET_SEGMENT_CACHE = new Map<string, string | null>();
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

// Kabutan renders the market classification inside <span class="market">,
// using fullwidth letters: 東証Ｐ / 東証Ｓ / 東証Ｇ for Prime / Standard / Growth.
// Expand them to the canonical names used on JPX.
const MARKET_LABEL_MAP: Array<[RegExp, string]> = [
  [/^東証Ｐ$/, "東証プライム"],
  [/^東証Ｓ$/, "東証スタンダード"],
  [/^東証Ｇ$/, "東証グロース"],
  [/^東証プライム$/, "東証プライム"],
  [/^東証スタンダード$/, "東証スタンダード"],
  [/^東証グロース$/, "東証グロース"],
  [/^名証Ｐ$/, "名証プレミア"],
  [/^名証Ｍ$/, "名証メイン"],
  [/^名証Ｎ$/, "名証ネクスト"],
  [/^札証$/, "札証"],
  [/^札証Ａ$/, "札証アンビシャス"],
  [/^福証$/, "福証"],
  [/^福証Ｑ$/, "福証Q-Board"],
];

function normaliseMarketLabel(raw: string): string {
  const trimmed = raw.trim();
  for (const [pattern, label] of MARKET_LABEL_MAP) {
    if (pattern.test(trimmed)) return label;
  }
  return trimmed;
}

export async function fetchMarketSegment(
  secCode: string | undefined,
): Promise<string | null> {
  if (!secCode) return null;

  const code = secCode.replace(/0$/, ""); // Remove trailing 0

  if (MARKET_SEGMENT_CACHE.has(code)) {
    return MARKET_SEGMENT_CACHE.get(code) ?? null;
  }

  const html = await fetchKabutanHtml(code);
  if (!html) {
    MARKET_SEGMENT_CACHE.set(code, null);
    return null;
  }

  // Primary signal: <span class="market">東証Ｐ</span>
  const m = html.match(/class="market[^"]*"[^>]*>\s*([^<\s][^<]*?)\s*</);
  if (m) {
    const label = normaliseMarketLabel(m[1]);
    MARKET_SEGMENT_CACHE.set(code, label);
    return label;
  }

  MARKET_SEGMENT_CACHE.set(code, null);
  return null;
}
