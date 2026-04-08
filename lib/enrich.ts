// ---- Company data enrichment from multiple web sources ----

// ---- Types ----

export interface EnrichSource {
  name: string;
  type: "news" | "wiki" | "website" | "press" | "reference";
  url: string;
  title: string;
  description?: string;
  date?: string;
  bodyText?: string;
}

export interface WikidataInfo {
  inceptionDate?: string;
  industry?: string;
  founder?: string;
  employeeCount?: number;
  officialWebsite?: string;
  description?: string;
  sourceUrl: string;
  revenue?: number;
  netIncome?: number;
  totalAssets?: number;
  operatingIncome?: number;
  ceo?: string;
  parentCompany?: string;
  parentOrg?: string;
  subsidiaries?: string[];
  ownedCompanies?: string[];
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface EnrichResult {
  companyName: string;
  news: EnrichSource[];
  wikipedia: EnrichSource | null;
  websiteMeta: EnrichSource | null;
  pressReleases: EnrichSource[];
  webResults: WebSearchResult[];
  referenceLinks: EnrichSource[];
}

// ---- Google News RSS ----

export async function fetchGoogleNews(
  companyName: string,
): Promise<EnrichSource[]> {
  try {
    const q = encodeURIComponent(companyName);
    const url = `https://news.google.com/rss/search?q=${q}&hl=ja&gl=JP&ceid=JP:ja`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseNewsRss(xml).slice(0, 10);
  } catch {
    return [];
  }
}

function parseNewsRss(xml: string): EnrichSource[] {
  const items: EnrichSource[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractXmlTag(block, "title");
    const link = extractXmlTag(block, "link");
    const pubDate = extractXmlTag(block, "pubDate");
    const source = extractXmlTag(block, "source");

    if (title && link) {
      items.push({
        name: source ? decodeHtml(source) : "Google News",
        type: "news",
        url: link,
        title: decodeHtml(title),
        date: pubDate ? formatDate(pubDate) : undefined,
      });
    }
  }

  return items;
}

// ---- Wikipedia API ----

interface WikiSearchResult {
  title: string;
  pageid: number;
  snippet: string;
}

export async function fetchWikipedia(
  companyName: string,
): Promise<EnrichSource | null> {
  try {
    const q = encodeURIComponent(companyName);
    const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=3&format=json&utf8=1&origin=*`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const results: WikiSearchResult[] = searchData?.query?.search || [];

    if (results.length === 0) return null;

    const bestMatch = results[0];
    const titleEnc = encodeURIComponent(bestMatch.title);
    const extractUrl = `https://ja.wikipedia.org/w/api.php?action=query&prop=extracts|info&exintro=1&explaintext=1&inprop=url&titles=${titleEnc}&format=json&utf8=1&origin=*`;
    const extractRes = await fetch(extractUrl, { next: { revalidate: 86400 } });
    if (!extractRes.ok) return null;
    const extractData = await extractRes.json();
    const pages = extractData?.query?.pages || {};
    const page = Object.values(pages)[0] as
      | {
          title: string;
          extract?: string;
          fullurl?: string;
        }
      | undefined;

    if (!page?.extract) return null;

    return {
      name: "Wikipedia",
      type: "wiki",
      url: page.fullurl || `https://ja.wikipedia.org/wiki/${titleEnc}`,
      title: page.title,
      description: page.extract.slice(0, 500),
    };
  } catch {
    return null;
  }
}

// ---- Corporate website meta scraping ----

export async function fetchWebsiteMeta(
  companyUrl: string | null | undefined,
): Promise<EnrichSource | null> {
  if (!companyUrl) return null;

  const url = companyUrl.startsWith("http")
    ? companyUrl
    : `https://${companyUrl}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EdinetMA/1.0)",
        Accept: "text/html",
      },
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    const title =
      extractMetaContent(html, 'property="og:title"') ||
      extractHtmlTitle(html) ||
      "";
    const description =
      extractMetaContent(html, 'property="og:description"') ||
      extractMetaContent(html, 'name="description"') ||
      "";

    // Extract body text from <p> tags for "事業内容" display
    const bodyText = extractBodyParagraphs(html);

    if (!title && !description && !bodyText) return null;

    return {
      name: "公式サイト",
      type: "website",
      url,
      title: decodeHtml(title),
      description: decodeHtml(description).slice(0, 500),
      bodyText,
    };
  } catch {
    return null;
  }
}

function extractBodyParagraphs(html: string): string {
  // Remove script/style/nav/header/footer tags and their content
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  // Extract text from <p>, <li>, <h1-h6>, <div> with substantial text
  const tagRegex =
    /<(?:p|li|h[1-6]|div|section|article)[^>]*>([\s\S]*?)<\/(?:p|li|h[1-6]|div|section|article)>/gi;
  const texts: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(cleaned)) !== null) {
    const text = decodeHtml(match[1].replace(/<[^>]*>/g, "").trim());
    // Only keep substantial paragraphs (not buttons, labels, etc.)
    if (text.length > 40 && !texts.includes(text)) {
      texts.push(text);
    }
  }

  return texts.slice(0, 8).join("\n\n");
}

function extractMetaContent(html: string, attr: string): string {
  const regex = new RegExp(
    `<meta[^>]*${attr}[^>]*content=["']([^"']*)["'][^>]*/?>`,
    "i",
  );
  const altRegex = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*${attr}[^>]*/?>`,
    "i",
  );
  const match = regex.exec(html) || altRegex.exec(html);
  return match?.[1] || "";
}

function extractHtmlTitle(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1]?.trim() || "";
}

// ---- PR TIMES scraping ----

export async function fetchPRTimes(
  companyName: string,
): Promise<EnrichSource[]> {
  try {
    const q = encodeURIComponent(companyName);
    const url = `https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=${q}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EdinetMA/1.0)",
        Accept: "text/html",
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const html = await res.text();
    return parsePRTimesResults(html).slice(0, 8);
  } catch {
    return [];
  }
}

function parsePRTimesResults(html: string): EnrichSource[] {
  const results: EnrichSource[] = [];

  // PR TIMES search results: <article> blocks
  const articleRegex =
    /<article[^>]*class="[^"]*list-article[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let articleMatch: RegExpExecArray | null;

  while ((articleMatch = articleRegex.exec(html)) !== null) {
    const block = articleMatch[1];

    const linkMatch = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!linkMatch) continue;

    let href = linkMatch[1];
    if (href.startsWith("/")) href = `https://prtimes.jp${href}`;

    const titleMatch =
      /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(block) ||
      /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(block);
    const title = titleMatch
      ? decodeHtml(titleMatch[1].replace(/<[^>]*>/g, "").trim())
      : decodeHtml(linkMatch[2].replace(/<[^>]*>/g, "").trim());

    const dateMatch =
      /<time[^>]*datetime="([^"]*)"[^>]*>/i.exec(block) ||
      /<time[^>]*>([\s\S]*?)<\/time>/i.exec(block);
    const date = dateMatch ? (dateMatch[1] || dateMatch[2])?.trim() : undefined;

    const companyMatch =
      /<span[^>]*class="[^"]*company-name[^"]*"[^>]*>([\s\S]*?)<\/span>/i.exec(
        block,
      );
    const company = companyMatch
      ? companyMatch[1].replace(/<[^>]*>/g, "").trim()
      : undefined;

    if (title && href) {
      results.push({
        name: company ? `PR TIMES (${company})` : "PR TIMES",
        type: "press",
        url: href,
        title,
        date: date ? formatDate(date) : undefined,
      });
    }
  }

  // Fallback: simpler link extraction
  if (results.length === 0) {
    const linkRegex =
      /<a[^>]*href="(https:\/\/prtimes\.jp\/main\/html\/rd\/p\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const title = decodeHtml(linkMatch[2].replace(/<[^>]*>/g, "").trim());
      if (title && title.length > 5) {
        results.push({
          name: "PR TIMES",
          type: "press",
          url: linkMatch[1],
          title,
        });
      }
    }
  }

  return results;
}

// ---- Reference links generation ----

export function generateReferenceLinks(
  companyName: string,
  corporateNumber?: string,
  location?: string,
): EnrichSource[] {
  const q = encodeURIComponent(companyName);
  const links: EnrichSource[] = [
    {
      name: "Google 検索",
      type: "reference",
      url: `https://www.google.com/search?q=${q}`,
      title: `「${companyName}」のGoogle検索結果`,
    },
    {
      name: "STARTUP DB",
      type: "reference",
      url: `https://startup-db.com/community/companies?keyword=${q}`,
      title: `STARTUP DB で検索`,
    },
    {
      name: "Crunchbase",
      type: "reference",
      url: `https://www.crunchbase.com/textsearch?q=${q}`,
      title: `Crunchbase で検索`,
    },
    {
      name: "Wantedly",
      type: "reference",
      url: `https://www.wantedly.com/search?q=${q}&t=company`,
      title: `Wantedly 企業ページ`,
    },
    {
      name: "LinkedIn",
      type: "reference",
      url: `https://www.linkedin.com/search/results/companies/?keywords=${q}`,
      title: `LinkedIn 企業ページ`,
    },
    {
      name: "PR TIMES",
      type: "reference",
      url: `https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=${q}`,
      title: `PR TIMES でプレスリリース検索`,
    },
    {
      name: "INITIAL",
      type: "reference",
      url: `https://initial.inc/companies?q=${q}`,
      title: `INITIAL (旧entrepedia) で検索`,
    },
    {
      name: "FUNDBOARD",
      type: "reference",
      url: `https://fundboard.co/search?q=${q}`,
      title: `FUNDBOARD で資金調達情報を検索`,
    },
    {
      name: "J-PlatPat (特許)",
      type: "reference",
      url: `https://www.j-platpat.inpit.go.jp/c1800/PU/JP/jpn/applicant?applicant=${q}`,
      title: `J-PlatPat で特許・出願情報を検索`,
    },
    {
      name: "Google Patents",
      type: "reference",
      url: `https://patents.google.com/?assignee=${q}&country=JP`,
      title: `Google Patents で特許を検索`,
    },
  ];

  if (corporateNumber) {
    links.push({
      name: "国税庁 法人番号公表サイト",
      type: "reference",
      url: `https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${corporateNumber}`,
      title: `法人番号 ${corporateNumber} の変更履歴`,
    });
    links.push({
      name: "gBizINFO",
      type: "reference",
      url: `https://info.gbiz.go.jp/hojin/ichiran?hojinBango=${corporateNumber}`,
      title: `gBizINFO 法人情報`,
    });
  }

  if (location) {
    const locQ = encodeURIComponent(`${companyName} ${location}`);
    links.push({
      name: "Google Maps",
      type: "reference",
      url: `https://www.google.com/maps/search/${locQ}`,
      title: `所在地を Google Maps で確認`,
    });
  }

  return links;
}

// ---- Wikidata structured data ----

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function fetchWikidata(
  companyName: string,
): Promise<WikidataInfo | null> {
  try {
    const q = encodeURIComponent(companyName);
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${q}&language=ja&format=json&limit=3&origin=*`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const entities = searchData?.search;
    if (!entities || entities.length === 0) return null;

    const entityId = entities[0].id as string;

    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims|descriptions&languages=ja|en&format=json&origin=*`;
    const entityRes = await fetch(entityUrl, { next: { revalidate: 86400 } });
    if (!entityRes.ok) return null;
    const entityData = await entityRes.json();
    const entity = entityData?.entities?.[entityId];
    if (!entity) return null;

    const claims = entity.claims || {};

    const inceptionDate = wdExtractTime(claims.P571);
    const employeeCount = wdExtractQuantity(claims.P1128);
    const officialWebsite = wdExtractString(claims.P856);

    // Resolve entity-reference labels (industry P452, founder P112)
    const refMap: Record<string, string> = {};
    const refIds: string[] = [];
    const industryId = wdExtractEntityId(claims.P452);
    if (industryId) {
      refIds.push(industryId);
      refMap.industry = industryId;
    }
    const founderId = wdExtractEntityId(claims.P112);
    if (founderId) {
      refIds.push(founderId);
      refMap.founder = founderId;
    }
    const ceoId = wdExtractEntityId(claims.P169);
    if (ceoId) {
      refIds.push(ceoId);
      refMap.ceo = ceoId;
    }
    const parentId = wdExtractEntityId(claims.P127);
    if (parentId) {
      refIds.push(parentId);
      refMap.parentCompany = parentId;
    }
    const parentOrgId = wdExtractEntityId(claims.P749);
    if (parentOrgId) {
      refIds.push(parentOrgId);
      refMap.parentOrg = parentOrgId;
    }

    // Multi-value: subsidiaries (P355) and owned companies (P1830)
    const subsidiaryIds = wdExtractEntityIds(claims.P355);
    const ownedIds = wdExtractEntityIds(claims.P1830);
    refIds.push(...subsidiaryIds, ...ownedIds);

    let labels: Record<string, string> = {};
    if (refIds.length > 0) {
      labels = await wdResolveLabels(refIds);
    }

    const subsidiaries = subsidiaryIds
      .map((id) => labels[id])
      .filter((v): v is string => Boolean(v));
    const ownedCompanies = ownedIds
      .map((id) => labels[id])
      .filter((v): v is string => Boolean(v));

    // Financial properties
    const revenue = wdExtractQuantity(claims.P2139);
    const netIncome = wdExtractQuantity(claims.P2295);
    const totalAssets = wdExtractQuantity(claims.P2403);
    const operatingIncome = wdExtractQuantity(claims.P3362);

    const description =
      entity.descriptions?.ja?.value || entity.descriptions?.en?.value;

    return {
      inceptionDate,
      industry: refMap.industry ? labels[refMap.industry] : undefined,
      founder: refMap.founder ? labels[refMap.founder] : undefined,
      employeeCount,
      officialWebsite,
      description,
      sourceUrl: `https://www.wikidata.org/wiki/${entityId}`,
      revenue,
      netIncome,
      totalAssets,
      operatingIncome,
      ceo: refMap.ceo ? labels[refMap.ceo] : undefined,
      parentCompany: refMap.parentCompany
        ? labels[refMap.parentCompany]
        : undefined,
      parentOrg: refMap.parentOrg ? labels[refMap.parentOrg] : undefined,
      subsidiaries: subsidiaries.length > 0 ? subsidiaries : undefined,
      ownedCompanies: ownedCompanies.length > 0 ? ownedCompanies : undefined,
    };
  } catch {
    return null;
  }
}

function wdExtractTime(claims: any[] | undefined): string | undefined {
  if (!claims?.length) return undefined;
  const time = claims[0]?.mainsnak?.datavalue?.value?.time as
    | string
    | undefined;
  const precision = claims[0]?.mainsnak?.datavalue?.value?.precision as
    | number
    | undefined;
  if (!time) return undefined;
  const m = /^\+?(\d{4})-(\d{2})-(\d{2})/.exec(time);
  if (!m) return undefined;
  if (precision && precision >= 11) return `${m[1]}-${m[2]}-${m[3]}`;
  if (precision && precision >= 10) return `${m[1]}-${m[2]}`;
  return m[1];
}

function wdExtractQuantity(claims: any[] | undefined): number | undefined {
  if (!claims?.length) return undefined;
  const amount = claims[0]?.mainsnak?.datavalue?.value?.amount as
    | string
    | undefined;
  if (!amount) return undefined;
  const n = parseInt(amount.replace("+", ""), 10);
  return isNaN(n) ? undefined : n;
}

function wdExtractString(claims: any[] | undefined): string | undefined {
  if (!claims?.length) return undefined;
  return claims[0]?.mainsnak?.datavalue?.value as string | undefined;
}

function wdExtractEntityId(claims: any[] | undefined): string | undefined {
  if (!claims?.length) return undefined;
  return claims[0]?.mainsnak?.datavalue?.value?.id as string | undefined;
}

function wdExtractEntityIds(claims: any[] | undefined): string[] {
  if (!claims?.length) return [];
  const ids: string[] = [];
  for (const c of claims) {
    // Skip statements marked as deprecated / end-dated (has P582 end date qualifier)
    const rank = c?.rank as string | undefined;
    if (rank === "deprecated") continue;
    const endDate = c?.qualifiers?.P582;
    if (Array.isArray(endDate) && endDate.length > 0) continue;
    const id = c?.mainsnak?.datavalue?.value?.id as string | undefined;
    if (id) ids.push(id);
  }
  return ids;
}

async function wdResolveLabels(ids: string[]): Promise<Record<string, string>> {
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}&props=labels&languages=ja|en&format=json&origin=*`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return {};
    const data = await res.json();
    const ents = data?.entities || {};
    const result: Record<string, string> = {};
    for (const [id, e] of Object.entries(ents)) {
      const ent = e as any;
      result[id] = ent.labels?.ja?.value || ent.labels?.en?.value || id;
    }
    return result;
  } catch {
    return {};
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- External patent search ----

export interface PatentSearchItem {
  title: string;
  url: string;
  source: string;
  snippet?: string;
  date?: string;
}

/** Google News RSS で特許関連ニュースを検索 */
async function fetchPatentNews(
  companyName: string,
): Promise<PatentSearchItem[]> {
  try {
    const q = encodeURIComponent(`"${companyName}" 特許 OR 出願 OR patent`);
    const url = `https://news.google.com/rss/search?q=${q}&hl=ja&gl=JP&ceid=JP:ja`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseNewsRss(xml)
      .slice(0, 8)
      .map((item) => ({
        title: item.title,
        url: item.url,
        source: item.name,
        date: item.date,
      }));
  } catch {
    return [];
  }
}

/** DuckDuckGo HTML 検索で特許情報を取得 */
async function fetchBingPatents(
  companyName: string,
): Promise<PatentSearchItem[]> {
  const shortName = companyName
    .replace(/株式会社|（株）|有限会社|合同会社/g, "")
    .trim();
  const results = await bingSearch(`${shortName} 特許 出願`);
  return results.map((r) => ({
    title: r.title,
    url: r.url,
    source: r.source,
    snippet: r.snippet,
  }));
}

// ---- General web search via Bing ----

async function bingSearch(query: string): Promise<WebSearchResult[]> {
  try {
    const q = encodeURIComponent(query);
    const url = `https://www.bing.com/search?q=${q}&setlang=ja`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ja,en;q=0.5",
      },
      next: { revalidate: 86400 },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const html = await res.text();
    return parseBingResults(html);
  } catch {
    return [];
  }
}

function parseBingResults(html: string): WebSearchResult[] {
  const results: WebSearchResult[] = [];
  // Bing wraps each result in <li class="b_algo">
  const blockRegex = /<li class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const block = blockMatch[1];

    // Extract URL from bing redirect or direct href
    const hrefMatch =
      /<h2[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(block);
    if (!hrefMatch) continue;

    let href = hrefMatch[1];
    const title = decodeHtml(hrefMatch[2].replace(/<[^>]*>/g, "").trim());
    if (!title) continue;

    // Bing redirect: extract actual URL from u= parameter
    const uMatch = /[?&]u=a1(.*?)&/.exec(href);
    if (uMatch) {
      try {
        href = decodeURIComponent(
          Buffer.from(uMatch[1], "base64").toString("utf-8"),
        );
      } catch {
        // keep original href
      }
    }

    // Extract snippet from <p> inside b_caption
    const snippetMatch =
      /<p[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(block);
    const snippet = snippetMatch
      ? decodeHtml(snippetMatch[1].replace(/<[^>]*>/g, "").trim())
      : "";

    try {
      const hostname = new URL(href).hostname.replace("www.", "");
      if (hostname.includes("bing.com")) continue;
      results.push({ title, url: href, snippet, source: hostname });
    } catch {
      // invalid URL
    }
  }

  return results.slice(0, 10);
}

/**
 * 複数クエリを並列実行して結果を統合・重複排除する汎用Web検索
 * queryOverride を指定するとそのクエリだけ使う（フォールバック用）
 */
export async function fetchCompanyWebSearch(
  companyNameOrQuery: string,
): Promise<WebSearchResult[]> {
  const results = await bingSearch(companyNameOrQuery);
  return dedupeWebResults(results);
}

/** 複数クエリ並列 → 統合・重複排除 */
export async function fetchMultiWebSearch(
  queries: string[],
): Promise<WebSearchResult[]> {
  const settled = await Promise.allSettled(queries.map((q) => bingSearch(q)));
  const all: WebSearchResult[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  return dedupeWebResults(all);
}

function dedupeWebResults(items: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  return items.filter((r) => {
    const key = r.url.replace(/[?#].*$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 複数ソースから特許情報を並列取得 */
export async function fetchExternalPatents(
  companyName: string,
): Promise<PatentSearchItem[]> {
  const [ddg, news] = await Promise.allSettled([
    fetchBingPatents(companyName),
    fetchPatentNews(companyName),
  ]);

  const items: PatentSearchItem[] = [];
  if (ddg.status === "fulfilled") items.push(...ddg.value);
  if (news.status === "fulfilled") items.push(...news.value);

  // Deduplicate by title
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.slice(0, 40).toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---- Main enrichment function ----

export async function enrichCompany(params: {
  name: string;
  corporateNumber?: string;
  location?: string;
  companyUrl?: string | null;
}): Promise<EnrichResult> {
  const shortName = params.name
    .replace(/株式会社|（株）|有限会社|合同会社/g, "")
    .trim();

  const [news, wikipedia, websiteMeta, pressReleases, webResults] =
    await Promise.allSettled([
      fetchGoogleNews(params.name),
      fetchWikipedia(params.name),
      fetchWebsiteMeta(params.companyUrl),
      fetchPRTimes(params.name),
      fetchMultiWebSearch([
        `${shortName} 会社概要 事業内容`,
        `${shortName} 採用 求人 エンジニア`,
        `${shortName} 評判 口コミ 年収`,
      ]),
    ]);

  const referenceLinks = generateReferenceLinks(
    params.name,
    params.corporateNumber,
    params.location,
  );

  return {
    companyName: params.name,
    news: news.status === "fulfilled" ? news.value : [],
    wikipedia: wikipedia.status === "fulfilled" ? wikipedia.value : null,
    websiteMeta: websiteMeta.status === "fulfilled" ? websiteMeta.value : null,
    pressReleases:
      pressReleases.status === "fulfilled" ? pressReleases.value : [],
    webResults: webResults.status === "fulfilled" ? webResults.value : [],
    referenceLinks,
  };
}

// ---- Shared utilities ----

function extractXmlTag(xml: string, tag: string): string | null {
  const regex = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`,
    "s",
  );
  const match = regex.exec(xml);
  return match?.[1]?.trim() || null;
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}
