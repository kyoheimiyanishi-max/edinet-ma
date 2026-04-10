import {
  getCompany,
  getCompanyShareholders,
  getCompanyFinancials,
  getCompanyOfficers,
  formatYen,
  formatPct,
  formatSharePct,
  creditColor,
  changeColor,
  formatChange,
  getEdinetUrl,
  EdinetApiError,
} from "@/lib/edinetdb";
import type { FinancialHistory, Officer } from "@/lib/edinetdb";
import { fetchMarketSegment, fetchMarketCap } from "@/lib/market";
import { searchNews, formatPubDate } from "@/lib/news";
import ExpandableLinkList, {
  type LineItem,
} from "@/components/ExpandableLinkList";
import NewsFilterSection from "@/components/NewsFilterSection";
import { summarizeItems } from "@/lib/summary";
import {
  enrichCompany,
  fetchWikidata,
  type EnrichResult,
  type WikidataInfo,
  type WebSearchResult,
} from "@/lib/enrich";
import {
  aggregateGroupCompanies,
  fromWikidata,
  relationChipStyle,
  relationBadgeLetter,
  type GroupCompany,
} from "@/lib/group-companies";
import { FinancialCharts } from "@/components/FinancialCharts";
import type { FinancialChartData } from "@/components/FinancialCharts";
import Link from "next/link";
import { Suspense } from "react";
import CompanyAnalysis from "@/components/CompanyAnalysis";
import { CompanyAnalysisProvider } from "@/components/CompanyAnalysisContext";
import CompanyOverviewText from "@/components/CompanyOverviewText";
import AddToSellerButton from "@/components/AddToSellerButton";
import AiRunButton from "@/components/AiRunButton";
import { notFound, redirect } from "next/navigation";
import { parseCompanyId } from "@/lib/unified-company";
import { getByName as findEdinetByName } from "@/lib/edinet-codelist";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ai?: string }>;
}

// ---- Shared UI ----

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
      <p className="text-xs text-slate-400 mb-1 font-medium">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function GroupCompanyChip({ company }: { company: GroupCompany }) {
  const style = relationChipStyle(company.relation);
  const letter = relationBadgeLetter(company.relation);
  // EDINET codelist で名寄せ: 一致したら直接 /company/{id} へ、無ければ
  // 既存の検索ページ経由 (フォールバック)
  const edinetEntry = findEdinetByName(company.name);
  const href = edinetEntry
    ? `/company/${edinetEntry.corporateNumber ?? edinetEntry.edinetCode}`
    : `/search?q=${encodeURIComponent(company.name)}`;
  const matched = Boolean(edinetEntry);
  const title = [
    matched ? `${company.name} の詳細を開く` : `${company.name} を検索`,
    company.ownershipPct != null ? `出資比率: ${company.ownershipPct}%` : "",
    company.description || "",
    `出典: ${company.sources.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${style}`}
      title={title}
    >
      <span className="text-[9px] px-1 py-0.5 rounded bg-white/60 font-bold tracking-wider">
        {letter}
      </span>
      <span>{company.name}</span>
      {matched && (
        <span className="text-[9px] text-emerald-600" title="EDINET登録あり">
          ●
        </span>
      )}
      {company.ownershipPct != null && (
        <span className="text-[10px] opacity-70 tabular-nums">
          {company.ownershipPct}%
        </span>
      )}
    </Link>
  );
}

function SectionCard({
  title,
  badge,
  action,
  children,
}: {
  title: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <h3 className="font-semibold text-slate-700">{title}</h3>
          {badge && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {badge}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function SummarySectionCard({
  title,
  badge,
  items,
  emptyText,
  aiSummary,
}: {
  title: string;
  badge?: string;
  items: LineItem[];
  emptyText: string;
  aiSummary?: string;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <h3 className="font-semibold text-slate-700">{title}</h3>
          {badge && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          {items.length === 0 ? (
            <span className="text-sm text-slate-400">{emptyText}</span>
          ) : aiSummary ? (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shrink-0"
                title="Claude AI による要約"
              >
                ✨ AI
              </span>
              <span
                className="text-sm text-slate-700 truncate"
                title={aiSummary}
              >
                {aiSummary}
              </span>
              <span className="text-[10px] text-slate-400 shrink-0">
                {items.length} 件
              </span>
            </div>
          ) : (
            <a
              href={items[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 max-w-full text-sm text-slate-600 hover:text-blue-600 transition-colors"
              title={items[0].title}
            >
              <span className="truncate">{items[0].title}</span>
              {items.length > 1 && (
                <span className="text-[10px] text-slate-400 shrink-0">
                  他 {items.length - 1} 件
                </span>
              )}
            </a>
          )}
        </div>
      </div>
      <div className="p-6">
        <ExpandableLinkList items={items} emptyText={emptyText} />
      </div>
    </section>
  );
}

function SummarySectionSkeleton({
  title,
  badge,
}: {
  title: string;
  badge?: string;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 shrink-0">
          <h3 className="font-semibold text-slate-700">{title}</h3>
          {badge && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {badge}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="shimmer h-4 rounded w-48" />
        </div>
      </div>
      <div className="p-6">
        <div className="shimmer h-24 rounded-xl" />
      </div>
    </section>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
    >
      {children}
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}

function SourceLink({ url, name }: { url: string; name: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition-colors"
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101"
        />
      </svg>
      出典: {name}
    </a>
  );
}

function formatInceptionYear(dateStr: string): string {
  // Wikidata inception は "1969-06-04" や "+1969-06-04T00:00:00Z" など。
  // 年だけ抜き出して「1969年」に。
  const m = dateStr.match(/(\d{4})/);
  return m ? `${m[1]}年` : dateStr;
}

function formatInceptionDate(dateStr: string): string {
  // 年月日がすべて入っていれば「1969年6月4日」、月日が欠けていれば「1969年」に。
  const ymd = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return `${ymd[1]}年${Number(ymd[2])}月${Number(ymd[3])}日`;
  }
  const y = dateStr.match(/(\d{4})/);
  return y ? `${y[1]}年` : dateStr;
}

function formatYenOrDash(n: number | null | undefined): string {
  return n != null ? formatYen(n) : "-";
}

function buildFallbackOverview(ctx: {
  name: string;
  nameEn?: string | null;
  industry?: string;
  inceptionDate?: string;
  founder?: string;
  ceo?: string;
  employeeCount?: number;
  accountingStandard?: string;
  dataYears?: number;
}): string {
  const parts: string[] = [];
  parts.push(ctx.name);
  if (ctx.nameEn) parts.push(`（${ctx.nameEn}）`);
  if (ctx.industry) parts.push(`は ${ctx.industry} に属する企業です。`);
  else parts.push("の基本情報です。");

  const facts: string[] = [];
  if (ctx.inceptionDate) {
    facts.push(`設立 ${formatInceptionYear(ctx.inceptionDate)}`);
  }
  if (ctx.founder) facts.push(`創業者 ${ctx.founder}`);
  if (ctx.ceo) facts.push(`現CEO ${ctx.ceo}`);
  if (ctx.employeeCount != null) {
    facts.push(`従業員数 約${ctx.employeeCount.toLocaleString()}名`);
  }
  if (ctx.accountingStandard) {
    facts.push(`会計基準 ${ctx.accountingStandard}`);
  }
  if (ctx.dataYears != null) {
    facts.push(`EDINET データ ${ctx.dataYears} 年分`);
  }

  if (facts.length > 0) {
    return parts.join("") + " " + facts.join(" / ") + "。";
  }
  return parts.join("");
}

function WebResultCard({ result }: { result: WebSearchResult }) {
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
    >
      <p className="text-sm text-slate-800 font-medium line-clamp-2">
        {result.title}
      </p>
      {result.snippet && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
          {result.snippet}
        </p>
      )}
      <div className="mt-1.5">
        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
          {result.source}
        </span>
      </div>
    </a>
  );
}

// ---- Data fetchers: return LineItem[] ----

function newsToItem(n: {
  title: string;
  link: string;
  source?: string;
  pubDate?: string;
}): LineItem {
  return {
    title: n.title,
    url: n.link,
    source: n.source,
    date: n.pubDate ? formatPubDate(n.pubDate) : undefined,
  };
}

function webResultToItem(r: WebSearchResult): LineItem {
  return {
    title: r.title,
    url: r.url,
    source: r.source,
    description: r.snippet,
  };
}

function dedupItems(items: LineItem[]): LineItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const out: LineItem[] = [];
  for (const item of items) {
    if (!item.title || !item.url) continue;
    const urlKey = item.url.split("?")[0];
    if (seenUrls.has(urlKey)) continue;
    const titleKey = item.title.slice(0, 40).toLowerCase();
    if (seenTitles.has(titleKey)) continue;
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    out.push(item);
  }
  return out;
}

async function fetchNewsAndWebItems(
  newsQueries: string[],
  webQueries: string[],
): Promise<LineItem[]> {
  const newsSettled = await Promise.allSettled(
    newsQueries.map((q) => searchNews(q)),
  );
  const newsItems = newsSettled
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .map(newsToItem);

  let webItems: LineItem[] = [];
  if (webQueries.length > 0) {
    const { fetchMultiWebSearch } = await import("@/lib/enrich");
    const webResults = await fetchMultiWebSearch(webQueries).catch(() => []);
    webItems = webResults.map(webResultToItem);
  }

  return dedupItems([...newsItems, ...webItems]);
}

// ---- Section server components: return <SummarySectionCard> ----

// 関連ニュースのカテゴリ判定ルール
// title + description にキーワードがヒットしたらタグを付与する
const NEWS_CATEGORY_RULES: Array<{ id: string; pattern: RegExp }> = [
  {
    id: "ma",
    pattern:
      /M&A|買収|合併|TOB|公開買付|経営統合|子会社化|完全子会社|株式譲渡|事業譲渡|資本業務提携|出資|買い取り/i,
  },
  {
    id: "earnings",
    pattern:
      /決算|業績|営業利益|純利益|売上高?|通期|四半期|増収|減収|黒字|赤字|上方修正|下方修正|業績予想/,
  },
  {
    id: "release",
    pattern:
      /リリース|発表|提供開始|発売|ローンチ|新サービス|新製品|新商品|開始|刷新|アップデート|公開/,
  },
];

function classifyNewsItem(item: LineItem): string[] {
  const text = `${item.title} ${item.description ?? ""}`;
  const cats: string[] = [];
  for (const rule of NEWS_CATEGORY_RULES) {
    if (rule.pattern.test(text)) cats.push(rule.id);
  }
  return cats;
}

async function CompanyNewsSection({
  companyName,
  aiEnabled,
}: {
  companyName: string;
  aiEnabled: boolean;
}) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const items = await fetchNewsAndWebItems(
    [
      shortName,
      `${shortName} リリース`,
      `${shortName} サービス OR 事業`,
      `${shortName} M&A 買収`,
      `${shortName} 統合 合併`,
      `${shortName} TOB 公開買付`,
      `${shortName} 決算 業績`,
    ],
    [
      `${shortName} 企業情報`,
      `${shortName} ニュース`,
      `${shortName} M&A`,
      `${shortName} 買収 合併`,
    ],
  );
  const taggedItems: LineItem[] = items.map((item) => ({
    ...item,
    categories: classifyNewsItem(item),
  }));
  // AI実行ボタン押下時のみ要約を走らせる
  const aiSummary = aiEnabled
    ? await summarizeItems(taggedItems, `${shortName} の関連ニュース`)
    : "";
  return (
    <NewsFilterSection
      title="関連ニュース"
      badge="自動検索"
      items={taggedItems}
      filters={[
        { id: "all", label: "全て" },
        { id: "ma", label: "M&A" },
        { id: "earnings", label: "業績・決算" },
        { id: "release", label: "リリース" },
      ]}
      emptyText="関連ニュースなし"
      aiSummary={aiSummary}
    />
  );
}

async function CompetitorSection({
  companyName,
  industry,
  aiEnabled,
}: {
  companyName: string;
  industry?: string;
  aiEnabled: boolean;
}) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const items = await fetchNewsAndWebItems(
    [
      `${shortName} 競合 ライバル 比較`,
      `${shortName} 業界 シェア`,
      `${shortName} 市場 動向`,
    ],
    [`${shortName} 競合`, `${shortName} 業界`],
  );

  // AI summary runs on web results only (before prepending the internal link)
  const aiSummary = aiEnabled
    ? await summarizeItems(
        items,
        `${shortName}（${industry ?? "業界不明"}）の競合・業界動向`,
      )
    : "";

  if (industry) {
    items.unshift({
      title: `同業種「${industry}」の企業一覧を見る →`,
      url: `/search?listed=listed&industry=${encodeURIComponent(industry)}`,
      source: "内部リンク",
    });
  }

  return (
    <SummarySectionCard
      title="競合企業・業界"
      badge="自動検索"
      items={items}
      emptyText="競合情報なし"
      aiSummary={aiSummary}
    />
  );
}

async function ReputationSection({
  companyName,
  aiEnabled,
}: {
  companyName: string;
  aiEnabled: boolean;
}) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const items = await fetchNewsAndWebItems(
    [
      `${shortName} 評判 口コミ 年収`,
      `${shortName} 働き方 ワークライフバランス`,
      `${shortName} OpenWork 転職`,
    ],
    [`${shortName} 評判 口コミ`, `${shortName} OpenWork`],
  );
  const aiSummary = aiEnabled
    ? await summarizeItems(items, `${shortName} の評判・口コミ・働き方`)
    : "";
  return (
    <SummarySectionCard
      title="評判・口コミ"
      badge="自動検索"
      items={items}
      emptyText="評判・口コミの情報なし"
      aiSummary={aiSummary}
    />
  );
}

async function WebFallbackSection({
  sectionTitle,
  sectionBadge,
  companyName,
  queries,
  emptyText,
  aiEnabled,
}: {
  sectionTitle: string;
  sectionBadge: string;
  companyName: string;
  queries: string[];
  emptyText: string;
  aiEnabled: boolean;
}) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const newsQueries = queries.map((q) => `${shortName} ${q.split(" OR ")[0]}`);
  const webQueries = queries.map((q) => `${shortName} ${q}`);
  const items = await fetchNewsAndWebItems(newsQueries, webQueries);
  const aiSummary = aiEnabled
    ? await summarizeItems(items, `${shortName} の${sectionTitle}`)
    : "";
  return (
    <SummarySectionCard
      title={sectionTitle}
      badge={sectionBadge}
      items={items}
      emptyText={emptyText}
      aiSummary={aiSummary}
    />
  );
}

// ---- Group companies section ----

async function GroupCompaniesSection({
  companyName,
  edinetCode,
  wikidata,
  description,
  aiEnabled,
}: {
  companyName: string;
  edinetCode?: string;
  wikidata?: WikidataInfo | null;
  description?: string;
  aiEnabled: boolean;
}) {
  if (!aiEnabled) {
    // ボタン押下前は Wikidata 由来のみ表示 (AI抽出はスキップ)。
    // Wikidata すら無ければプレースホルダ表示。
    const wdOnly = wikidata ? fromWikidata(wikidata) : [];
    if (wdOnly.length === 0) {
      return (
        <p className="text-sm text-slate-400 text-center py-4">
          「AI実行」ボタンを押すと Wikipedia・EDINET有報を AI
          で解析してグループ会社を抽出します
        </p>
      );
    }
    const parents0 = wdOnly.filter((g) => g.relation === "parent");
    const subsidiaries0 = wdOnly.filter((g) => g.relation === "subsidiary");
    const affiliates0 = wdOnly.filter((g) => g.relation === "affiliate");
    return (
      <div className="space-y-4">
        <p className="text-[11px] text-slate-400">
          Wikidata のみ表示中。「AI実行」で Wikipedia/EDINET AI抽出を追加
        </p>
        {parents0.length > 0 && (
          <GroupSection title="親会社" companies={parents0} />
        )}
        {subsidiaries0.length > 0 && (
          <GroupSection title="子会社" companies={subsidiaries0} />
        )}
        {affiliates0.length > 0 && (
          <GroupSection
            title="関連会社・グループ会社"
            companies={affiliates0}
          />
        )}
      </div>
    );
  }

  const groups = await aggregateGroupCompanies({
    companyName,
    edinetCode,
    wikidata,
    description,
  }).catch(() => [] as GroupCompany[]);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">
        グループ会社・関連企業の情報が見つかりませんでした
      </p>
    );
  }

  const parents = groups.filter((g) => g.relation === "parent");
  const subsidiaries = groups.filter((g) => g.relation === "subsidiary");
  const affiliates = groups.filter((g) => g.relation === "affiliate");

  // Count by source for footer summary
  const sourceCounts = new Map<string, number>();
  for (const g of groups) {
    for (const s of g.sources) {
      sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-5">
      {parents.length > 0 && (
        <GroupSection title="親会社" companies={parents} />
      )}
      {subsidiaries.length > 0 && (
        <GroupSection title="子会社" companies={subsidiaries} />
      )}
      {affiliates.length > 0 && (
        <GroupSection title="関連会社・グループ会社" companies={affiliates} />
      )}

      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
        <span className="font-semibold text-slate-500">データソース:</span>
        {Array.from(sourceCounts.entries()).map(([src, count]) => (
          <span key={src} className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            {src} ({count})
          </span>
        ))}
      </div>
    </div>
  );
}

function GroupSection({
  title,
  companies,
}: {
  title: string;
  companies: GroupCompany[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        {title}{" "}
        <span className="text-slate-400 font-normal normal-case">
          ({companies.length})
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {companies.map((c) => (
          <GroupCompanyChip key={`${c.relation}-${c.name}`} company={c} />
        ))}
      </div>
    </div>
  );
}

// ---- Enriched sections (streamed via Suspense) ----

async function EnrichedSections({
  name,
  companyUrl,
  aiEnabled,
}: {
  name: string;
  companyUrl?: string | null;
  aiEnabled: boolean;
}) {
  let enriched: EnrichResult;
  try {
    enriched = await enrichCompany({ name, companyUrl });
  } catch {
    enriched = {
      companyName: name,
      news: [],
      wikipedia: null,
      websiteMeta: null,
      pressReleases: [],
      webResults: [],
      referenceLinks: [],
      noteArticles: [],
    };
  }

  const wantedlyResults = enriched.webResults.filter((r) =>
    r.source.includes("wantedly"),
  );
  const jobResults = enriched.webResults.filter(
    (r) =>
      r.source.includes("recruit") ||
      r.source.includes("green-japan") ||
      r.source.includes("en-japan") ||
      r.source.includes("doda") ||
      r.source.includes("rikunabi"),
  );

  return (
    <>
      {/* 事業内容 */}
      {enriched.websiteMeta?.bodyText && (
        <SectionCard title="事業内容" badge="公式サイトから取得">
          <div className="space-y-3">
            {enriched.websiteMeta.bodyText
              .split("\n\n")
              .filter((t) => t.trim())
              .map((p, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed">
                  {p}
                </p>
              ))}
          </div>
          <div className="mt-4">
            <SourceLink url={enriched.websiteMeta.url} name="公式サイト" />
          </div>
        </SectionCard>
      )}

      {/* 特許情報 */}
      <Suspense
        fallback={<SummarySectionSkeleton title="特許情報" badge="自動取得" />}
      >
        <WebFallbackSection
          sectionTitle="特許情報"
          sectionBadge="自動取得"
          companyName={name}
          queries={["特許 OR 出願 OR patent", "知的財産 OR 技術 OR 発明"]}
          emptyText="特許関連情報なし"
          aiEnabled={aiEnabled}
        />
      </Suspense>

      {/* 補助金 */}
      <Suspense
        fallback={
          <SummarySectionSkeleton title="補助金・助成金" badge="自動取得" />
        }
      >
        <WebFallbackSection
          sectionTitle="補助金・助成金"
          sectionBadge="自動取得"
          companyName={name}
          queries={[
            "補助金 OR 助成金 OR 採択",
            "支援 OR NEDO OR JST OR 経産省",
          ]}
          emptyText="補助金・助成金情報なし"
          aiEnabled={aiEnabled}
        />
      </Suspense>

      {/* 届出・認定 */}
      <Suspense
        fallback={
          <SummarySectionSkeleton title="届出・認定情報" badge="自動取得" />
        }
      >
        <WebFallbackSection
          sectionTitle="届出・認定情報"
          sectionBadge="自動取得"
          companyName={name}
          queries={[
            "認定 OR 届出 OR ISO OR Pマーク",
            "受賞 OR 表彰 OR アワード OR 選出",
          ]}
          emptyText="届出・認定情報なし"
          aiEnabled={aiEnabled}
        />
      </Suspense>

      {/* 採用・カルチャー */}
      {wantedlyResults.length > 0 && (
        <SectionCard title="採用・カルチャー" badge="Wantedly">
          <div className="space-y-2">
            {wantedlyResults.map((r, i) => (
              <WebResultCard key={i} result={r} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* 求人情報 */}
      {jobResults.length > 0 && (
        <SectionCard title="求人情報" badge={`${jobResults.length} 件`}>
          <div className="space-y-2">
            {jobResults.map((r, i) => (
              <WebResultCard key={i} result={r} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* note 記事 */}
      <SectionCard
        title="note 記事"
        badge={
          enriched.noteArticles.length > 0
            ? `${enriched.noteArticles.length} 件`
            : "検索"
        }
      >
        <div className="space-y-3">
          {enriched.noteArticles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-green-50/50 hover:border-green-200 transition-all group"
            >
              {article.eyecatch && (
                <img
                  src={article.eyecatch}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 group-hover:text-green-700 transition-colors line-clamp-2">
                  {article.title}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-[8px] text-green-700 font-bold shrink-0">
                      n
                    </span>
                    {article.userName}
                  </span>
                  {article.likes > 0 && <span>♡ {article.likes}</span>}
                  {article.publishedAt && (
                    <span>
                      {new Date(article.publishedAt).toLocaleDateString(
                        "ja-JP",
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                    </span>
                  )}
                </div>
              </div>
              <svg
                className="w-4 h-4 text-slate-300 group-hover:text-green-400 shrink-0 mt-1 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          ))}
        </div>
        {enriched.noteArticles.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            note.com で「{name.replace(/株式会社|（株）/g, "").trim()}
            」の記事を検索できます
          </p>
        )}
        <div className="mt-3 pt-2 border-t border-slate-100">
          <SourceLink
            url={`https://note.com/search?q=${encodeURIComponent(name.replace(/株式会社|（株）/g, "").trim())}&context=note`}
            name="note.com で検索"
          />
        </div>
      </SectionCard>

      {/* 関連リンク */}
      {enriched.referenceLinks.length > 0 && (
        <SectionCard
          title="関連リンク"
          badge={`${enriched.referenceLinks.length} サイト`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {enriched.referenceLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all text-sm group"
              >
                <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-400 transition-colors shrink-0" />
                <span className="text-slate-700 group-hover:text-blue-700 font-medium truncate transition-colors">
                  {link.name}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400 shrink-0 ml-auto transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}

// ---- Main page ----

export default async function CompanyPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const aiEnabled = sp.ai === "1";

  // id は EDINETコード (E+5桁) または 法人番号 (13桁数字) を受け付ける。
  // 法人番号の場合は edinet-codelist でマッピングを引き、EDINETコードが
  // 見つかれば EDINET フローへ、見つからなければ gBizINFO フローへ。
  const parsed = parseCompanyId(id);
  if (!parsed) notFound();

  if (parsed.kind === "corporate" && !parsed.edinetCode) {
    // EDINET 未登録の法人番号は startups ページ (gBizINFO ビュー) へリダイレクト
    redirect(`/startups/${parsed.corporateNumber}${aiEnabled ? "?ai=1" : ""}`);
  }

  const code =
    parsed.kind === "edinet" ? parsed.edinetCode : parsed.edinetCode!;

  try {
    const [company, shareholders, financials, officers] = await Promise.all([
      getCompany(code),
      getCompanyShareholders(code),
      getCompanyFinancials(code),
      getCompanyOfficers(code).catch(() => [] as Officer[]),
    ]);
    const [marketSegment, scrapedMarketCap, wd] = await Promise.all([
      fetchMarketSegment(company.sec_code),
      company.market_cap == null
        ? fetchMarketCap(company.sec_code)
        : Promise.resolve(null),
      fetchWikidata(company.name).catch(() => null),
    ]);

    const f = company.latest_financials;
    const e = company.latest_earnings;
    const secCode = company.sec_code?.replace(/0$/, "");
    const marketCap = company.market_cap ?? scrapedMarketCap;

    const chartData: FinancialChartData[] =
      financials.length > 0
        ? financials.map((fh: FinancialHistory) => ({
            fiscal_year: fh.fiscal_year,
            revenue: fh.revenue,
            operating_income: fh.operating_income,
            net_income: fh.net_income,
            total_assets: fh.total_assets,
            equity: fh.equity,
            cash: fh.cash,
            equity_ratio_official: fh.equity_ratio_official,
            eps: fh.eps,
            bps: fh.bps,
            roe: fh.roe,
            roa: fh.roa,
            market_cap: fh.market_cap,
            avg_annual_salary: fh.avg_annual_salary,
          }))
        : f
          ? [
              {
                fiscal_year: f.fiscal_year,
                revenue: f.revenue,
                operating_income: f.operating_income,
                net_income: f.net_income,
                total_assets: f.total_assets,
                equity: f.equity,
                cash: f.cash,
                equity_ratio_official: f.equity_ratio_official,
                eps: f.eps,
                bps: f.bps,
                roe: f.roe,
                roa: f.roa,
                market_cap: marketCap ?? null,
                avg_annual_salary: f.avg_annual_salary ?? null,
              },
            ]
          : [];

    const byHolder = new Map<string, (typeof shareholders)[0]>();
    for (const s of shareholders) {
      const existing = byHolder.get(s.holder_name);
      if (!existing || s.submit_date_time > existing.submit_date_time)
        byHolder.set(s.holder_name, s);
    }
    const latestHolders = Array.from(byHolder.values()).sort(
      (a, b) => b.total_holding_ratio - a.total_holding_ratio,
    );
    const totalHoldingPct = latestHolders.reduce(
      (sum, h) => sum + h.total_holding_ratio,
      0,
    );
    const increasingHolders = latestHolders.filter(
      (h) => h.holding_ratio > h.holding_ratio_previous,
    );
    const decreasingHolders = latestHolders.filter(
      (h) => h.holding_ratio < h.holding_ratio_previous,
    );

    return (
      <div className="space-y-6">
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          企業一覧に戻る
        </Link>

        {/* ===== Header ===== */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-800">
                  {company.name}
                </h2>
                <AiRunButton enabled={aiEnabled} />
              </div>
              {company.name_en && (
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  {company.name_en}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded-lg text-slate-500">
                  {company.edinet_code}
                </span>
                {company.sec_code && (
                  <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded-lg text-slate-500">
                    {company.sec_code}
                  </span>
                )}
                <span className="text-xs px-2 py-1 bg-blue-50 rounded-lg text-blue-600">
                  {company.industry}
                </span>
                {marketSegment && (
                  <span className="text-xs px-2 py-1 bg-emerald-50 rounded-lg text-emerald-600 font-medium">
                    {marketSegment}
                  </span>
                )}
                {company.listing_category && !marketSegment && (
                  <span className="text-xs px-2 py-1 bg-emerald-50 rounded-lg text-emerald-600">
                    {company.listing_category}
                  </span>
                )}
                {wd?.industry && !company.industry && (
                  <span className="text-xs px-2 py-1 bg-blue-50 rounded-lg text-blue-600">
                    {wd.industry}
                  </span>
                )}
                {company.accounting_standard && (
                  <span className="text-xs px-2 py-1 bg-slate-50 rounded-lg text-slate-600 border border-slate-200">
                    {company.accounting_standard}
                  </span>
                )}
                {wd?.inceptionDate && (
                  <span className="text-xs px-2 py-1 bg-amber-50 rounded-lg text-amber-700">
                    設立 {formatInceptionYear(wd.inceptionDate)}
                  </span>
                )}
                {wd?.employeeCount != null && (
                  <span className="text-xs px-2 py-1 bg-indigo-50 rounded-lg text-indigo-700">
                    従業員 {wd.employeeCount.toLocaleString()}名
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-3.5 py-1.5 rounded-full text-sm font-bold shadow-sm ${creditColor(company.credit_rating)}`}
              >
                {company.credit_rating} ({company.credit_score}pt)
              </span>
              <AddToSellerButton
                companyName={company.name}
                companyCode={company.edinet_code}
                industry={company.industry}
              />
            </div>
          </div>
          {wd?.description && (
            <div className="mt-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
              {wd.description}
              <div className="mt-2">
                <SourceLink url={wd.sourceUrl} name="Wikidata" />
              </div>
            </div>
          )}
        </div>

        <CompanyAnalysisProvider
          edinetCode={company.edinet_code}
          autoRun={aiEnabled}
          maCompany={{
            name: company.name,
            industry: company.industry,
            listingCategory: company.listing_category,
            creditRating: company.credit_rating,
            creditScore: company.credit_score,
            marketCap: marketCap ?? undefined,
            revenue: f?.revenue ?? undefined,
            operatingIncome: f?.operating_income ?? undefined,
            netIncome: f?.net_income ?? undefined,
            totalAssets: f?.total_assets ?? undefined,
            equity: f?.equity ?? undefined,
            cash: f?.cash ?? undefined,
            equityRatio: f?.equity_ratio_official ?? undefined,
            shareholders: latestHolders.slice(0, 10).map((h) => ({
              name: h.holder_name,
              ratio: h.total_holding_ratio,
              delta: h.holding_ratio - h.holding_ratio_previous,
              purpose: h.purpose || "",
            })),
            description: wd?.description ?? undefined,
          }}
        >
          {/* ===== サマリー ===== */}
          <SectionCard title="サマリー" badge="主要指標">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-1.5 font-medium">
                  会社概要
                </p>
                <CompanyOverviewText
                  fallback={
                    wd?.description ||
                    buildFallbackOverview({
                      name: company.name,
                      nameEn: company.name_en,
                      industry: company.industry,
                      inceptionDate: wd?.inceptionDate,
                      founder: wd?.founder,
                      ceo: wd?.ceo,
                      employeeCount: wd?.employeeCount,
                      accountingStandard: company.accounting_standard,
                      dataYears: company.data_years,
                    })
                  }
                  fallbackSourceName={wd?.description ? "Wikidata" : undefined}
                  fallbackSourceUrl={wd?.description ? wd.sourceUrl : undefined}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <MetricCard
                  label="上場区分"
                  value={
                    marketSegment ||
                    company.listing_category ||
                    (company.sec_code ? "上場" : "非上場")
                  }
                />
                <MetricCard
                  label="時価総額"
                  value={formatYenOrDash(marketCap)}
                  sub={
                    company.market_cap == null && marketCap != null
                      ? "kabutan"
                      : undefined
                  }
                />
                <MetricCard
                  label="売上高"
                  value={
                    f?.revenue != null
                      ? formatYen(f.revenue)
                      : wd?.revenue != null
                        ? formatYen(wd.revenue)
                        : "-"
                  }
                  sub={
                    f
                      ? `${f.fiscal_year}年度`
                      : wd?.revenue != null
                        ? "Wikidata"
                        : undefined
                  }
                />
                <MetricCard
                  label="現預金"
                  value={f?.cash != null ? formatYen(f.cash) : "-"}
                  sub={f ? `${f.fiscal_year}年度` : undefined}
                />
                <MetricCard
                  label="純利益"
                  value={
                    f?.net_income != null
                      ? formatYen(f.net_income)
                      : wd?.netIncome != null
                        ? formatYen(wd.netIncome)
                        : "-"
                  }
                  sub={
                    f
                      ? `${f.fiscal_year}年度`
                      : wd?.netIncome != null
                        ? "Wikidata"
                        : undefined
                  }
                />
              </div>
              {(company.accounting_standard ||
                company.data_years ||
                (company.data_notes && company.data_notes.length > 0)) && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  {company.accounting_standard && (
                    <span>
                      会計基準:{" "}
                      <span className="font-medium text-slate-700">
                        {company.accounting_standard}
                      </span>
                    </span>
                  )}
                  {company.data_years != null && (
                    <span>
                      データ蓄積:{" "}
                      <span className="font-medium text-slate-700">
                        {company.data_years}年分
                      </span>
                    </span>
                  )}
                  {company.data_notes?.map((note, i) => (
                    <span key={i} className="text-slate-400">
                      ※ {note}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* ===== 会社基本情報 (Wikidata由来) ===== */}
          {(wd?.inceptionDate ||
            wd?.founder ||
            wd?.ceo ||
            wd?.employeeCount != null ||
            wd?.parentOrg ||
            wd?.parentCompany ||
            company.name_en) && (
            <SectionCard title="会社基本情報" badge="Wikidata">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {company.name_en && (
                  <MetricCard label="英語名" value={company.name_en} />
                )}
                {wd?.inceptionDate && (
                  <MetricCard
                    label="設立"
                    value={formatInceptionDate(wd.inceptionDate)}
                  />
                )}
                {wd?.founder && (
                  <MetricCard label="創業者" value={wd.founder} />
                )}
                {wd?.ceo && <MetricCard label="CEO" value={wd.ceo} />}
                {wd?.employeeCount != null && (
                  <MetricCard
                    label="従業員数"
                    value={`${wd.employeeCount.toLocaleString()}名`}
                  />
                )}
                {wd?.parentOrg && (
                  <MetricCard label="親会社" value={wd.parentOrg} />
                )}
                {wd?.parentCompany && !wd.parentOrg && (
                  <MetricCard label="親会社" value={wd.parentCompany} />
                )}
                {wd?.officialWebsite && (
                  <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 col-span-2">
                    <p className="text-xs text-slate-400 mb-1 font-medium">
                      公式サイト
                    </p>
                    <a
                      href={wd.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium break-all"
                    >
                      {wd.officialWebsite}
                    </a>
                  </div>
                )}
              </div>
              {wd?.sourceUrl && (
                <div className="mt-3">
                  <SourceLink url={wd.sourceUrl} name="Wikidata" />
                </div>
              )}
            </SectionCard>
          )}

          {/* ===== グループ会社・関連企業 ===== */}
          <SectionCard
            title="グループ会社・関連企業"
            badge="Wikidata + Wikipedia + AI抽出"
          >
            <Suspense
              fallback={
                <div className="space-y-3">
                  <div className="shimmer h-5 w-24 rounded" />
                  <div className="flex flex-wrap gap-2">
                    <div className="shimmer h-8 w-32 rounded-full" />
                    <div className="shimmer h-8 w-40 rounded-full" />
                    <div className="shimmer h-8 w-28 rounded-full" />
                  </div>
                </div>
              }
            >
              <GroupCompaniesSection
                companyName={company.name}
                edinetCode={company.edinet_code}
                wikidata={wd}
                description={wd?.description}
                aiEnabled={aiEnabled}
              />
            </Suspense>
          </SectionCard>

          {/* ===== AI分析 + M&A戦略推察（上部の一括AI実行ボタンから連動） ===== */}
          <CompanyAnalysis />

          {/* ===== 財務推移チャート ===== */}
          {chartData.length > 0 && (
            <SectionCard
              title="財務推移"
              badge={
                chartData.length > 1
                  ? `${chartData[0].fiscal_year}〜${chartData[chartData.length - 1].fiscal_year}年`
                  : `${chartData[0].fiscal_year}年`
              }
            >
              <FinancialCharts data={chartData} />
            </SectionCard>
          )}

          {/* ===== P/L ===== */}
          {f && (
            <SectionCard
              title="損益計算書 (P/L)"
              badge={`${f.fiscal_year}年度`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <MetricCard label="売上高" value={formatYen(f.revenue)} />
                <MetricCard
                  label="営業利益"
                  value={formatYen(f.operating_income)}
                />
                <MetricCard label="純利益" value={formatYen(f.net_income)} />
                <MetricCard
                  label="EPS（1株利益）"
                  value={f.eps != null ? `${f.eps.toFixed(1)}円` : "-"}
                />
                {f.avg_annual_salary != null && (
                  <MetricCard
                    label="平均年収"
                    value={formatYen(f.avg_annual_salary)}
                    sub={
                      f.avg_age != null ? `平均年齢 ${f.avg_age}歳` : undefined
                    }
                  />
                )}
              </div>
              {f.edinet_filing_url && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <SourceLink
                    url={f.edinet_filing_url}
                    name={`有価証券報告書 (${f.fiscal_year}年度)`}
                  />
                </div>
              )}
            </SectionCard>
          )}

          {/* ===== B/S ===== */}
          {f && (
            <SectionCard
              title="貸借対照表 (B/S)"
              badge={`${f.fiscal_year}年度`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <MetricCard label="総資産" value={formatYen(f.total_assets)} />
                <MetricCard label="自己資本" value={formatYen(f.equity)} />
                <MetricCard label="現金・現預金" value={formatYen(f.cash)} />
                <MetricCard
                  label="自己資本比率"
                  value={formatPct(f.equity_ratio_official)}
                />
                <MetricCard
                  label="BPS（1株純資産）"
                  value={f.bps != null ? `${f.bps.toFixed(1)}円` : "-"}
                />
                {f.roe != null && (
                  <MetricCard
                    label="ROE（自己資本利益率）"
                    value={formatPct(f.roe)}
                  />
                )}
                {f.roa != null && (
                  <MetricCard
                    label="ROA（総資産利益率）"
                    value={formatPct(f.roa)}
                  />
                )}
              </div>
              {f.edinet_filing_url && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <SourceLink
                    url={f.edinet_filing_url}
                    name={`有価証券報告書 (${f.fiscal_year}年度)`}
                  />
                </div>
              )}
            </SectionCard>
          )}

          {/* ===== 財務指標（計算値） ===== */}
          {f && (f.revenue || f.operating_income || f.total_assets) && (
            <SectionCard title="財務指標" badge={`${f.fiscal_year}年度`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {f.revenue != null && f.operating_income != null && (
                  <MetricCard
                    label="営業利益率"
                    value={
                      f.revenue !== 0
                        ? `${((f.operating_income / f.revenue) * 100).toFixed(1)}%`
                        : "-"
                    }
                  />
                )}
                {f.revenue != null && f.net_income != null && (
                  <MetricCard
                    label="純利益率"
                    value={
                      f.revenue !== 0
                        ? `${((f.net_income / f.revenue) * 100).toFixed(1)}%`
                        : "-"
                    }
                  />
                )}
                {f.operating_income != null && (
                  <MetricCard
                    label="EBITDA（推定）"
                    value={formatYen(f.operating_income)}
                    sub="※減価償却費未加算"
                  />
                )}
                {f.total_assets != null &&
                  f.equity != null &&
                  f.equity !== 0 && (
                    <MetricCard
                      label="D/Eレシオ"
                      value={`${((f.total_assets - f.equity) / f.equity).toFixed(2)}倍`}
                    />
                  )}
                {f.total_assets != null && f.equity != null && (
                  <MetricCard
                    label="負債合計"
                    value={formatYen(f.total_assets - (f.equity ?? 0))}
                  />
                )}
                {f.net_income != null && f.cash != null && (
                  <MetricCard
                    label="FCF（推定）"
                    value={formatYen(f.net_income)}
                    sub="※簡易計算（純利益ベース）"
                  />
                )}
                {f.revenue != null &&
                  f.total_assets != null &&
                  f.total_assets !== 0 && (
                    <MetricCard
                      label="総資産回転率"
                      value={`${(f.revenue / f.total_assets).toFixed(2)}回`}
                    />
                  )}
                {f.roe != null && f.roa != null && f.roa !== 0 && (
                  <MetricCard
                    label="財務レバレッジ"
                    value={`${(f.roe / f.roa).toFixed(2)}倍`}
                  />
                )}
              </div>
            </SectionCard>
          )}

          {/* ===== 最新決算 ===== */}
          {e && (
            <SectionCard
              title="最新決算"
              badge={`${e.fiscal_year_end} Q${e.quarter}`}
              action={
                e.pdf_url ? (
                  <ExternalLink href={e.pdf_url}>決算短信 PDF</ExternalLink>
                ) : undefined
              }
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <MetricCard
                  label="売上高"
                  value={formatYen(e.revenue)}
                  sub={
                    e.revenue_change != null
                      ? ((
                          <span className={changeColor(e.revenue_change)}>
                            {formatChange(e.revenue_change)}
                          </span>
                        ) as unknown as string)
                      : undefined
                  }
                />
                <MetricCard
                  label="営業利益"
                  value={formatYen(e.operating_income)}
                  sub={
                    e.operating_income_change != null
                      ? ((
                          <span
                            className={changeColor(e.operating_income_change)}
                          >
                            {formatChange(e.operating_income_change)}
                          </span>
                        ) as unknown as string)
                      : undefined
                  }
                />
                <MetricCard
                  label="純利益"
                  value={formatYen(e.net_income)}
                  sub={
                    e.net_income_change != null
                      ? ((
                          <span className={changeColor(e.net_income_change)}>
                            {formatChange(e.net_income_change)}
                          </span>
                        ) as unknown as string)
                      : undefined
                  }
                />
              </div>
            </SectionCard>
          )}

          {/* ===== 主要役員 (EDINET 有報 由来) ===== */}
          {officers.length > 0 && (
            <SectionCard title="主要役員" badge={`${officers.length}名`}>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-medium">役職</th>
                      <th className="pb-3 pr-4 font-medium">氏名</th>
                      <th className="pb-3 pr-4 font-medium">生年月日</th>
                      <th className="pb-3 pr-4 font-medium text-right">
                        保有株数
                      </th>
                      <th className="pb-3 pr-4 font-medium">属性</th>
                      <th className="pb-3 font-medium">経歴・略歴</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {officers.map((o, i) => (
                      <tr
                        key={`officer-${i}-${o.name}`}
                        className="hover:bg-blue-50/50"
                      >
                        <td className="py-3 pr-4 text-slate-700 font-medium text-xs whitespace-nowrap">
                          {o.position}
                        </td>
                        <td className="py-3 pr-4 text-slate-800 font-medium whitespace-nowrap">
                          {o.name}
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap font-mono">
                          {o.birth_date || "-"}
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-600 whitespace-nowrap text-right font-mono">
                          {o.shares_held != null
                            ? `${o.shares_held.toLocaleString()}株`
                            : "-"}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {o.is_representative && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                                代表
                              </span>
                            )}
                            {o.is_outside && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                社外
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-xs text-slate-500 leading-relaxed max-w-md">
                          {o.career || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100">
                {f?.edinet_filing_url ? (
                  <SourceLink
                    url={f.edinet_filing_url}
                    name={`有価証券報告書 (${f.fiscal_year}年度)`}
                  />
                ) : (
                  <p className="text-[10px] text-slate-400">
                    出典: 有価証券報告書（EDINET）
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          {/* ===== 株主構成サマリー ===== */}
          <SectionCard
            title="株主構成サマリー"
            badge={`${latestHolders.length} 名`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <MetricCard
                label="大量保有者数"
                value={`${latestHolders.length}名`}
              />
              <MetricCard
                label="合計保有比率"
                value={`${(totalHoldingPct * 100).toFixed(1)}%`}
              />
              <MetricCard
                label="保有増加中"
                value={`${increasingHolders.length}名`}
                sub={increasingHolders.length > 0 ? "買い増し傾向" : undefined}
              />
              <MetricCard
                label="保有減少中"
                value={`${decreasingHolders.length}名`}
                sub={decreasingHolders.length > 0 ? "売却傾向" : undefined}
              />
            </div>
          </SectionCard>

          {/* ===== 大量保有報告書 ===== */}
          <SectionCard title="大量保有報告書" badge="詳細一覧">
            {latestHolders.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">
                大量保有報告書のデータなし
              </p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-medium">保有者</th>
                      <th className="pb-3 pr-4 font-medium text-right">
                        保有割合
                      </th>
                      <th className="pb-3 pr-4 font-medium text-right">
                        前回比
                      </th>
                      <th className="pb-3 pr-4 font-medium">目的</th>
                      <th className="pb-3 font-medium">報告日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {latestHolders.map((s, i) => {
                      const delta = s.holding_ratio - s.holding_ratio_previous;
                      return (
                        <tr
                          key={`${s.holder_name}-${i}`}
                          className="hover:bg-blue-50/50"
                        >
                          <td className="py-3 pr-4">
                            <p className="font-medium text-slate-800">
                              {s.holder_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {s.holder_type}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-right font-mono font-semibold text-slate-800">
                            {formatSharePct(s.total_holding_ratio)}
                          </td>
                          <td
                            className={`py-3 pr-4 text-right font-mono text-xs ${changeColor(delta)}`}
                          >
                            {delta !== 0
                              ? (delta > 0 ? "+" : "") +
                                (delta * 100).toFixed(2) +
                                "%"
                              : "-"}
                          </td>
                          <td
                            className="py-3 pr-4 text-xs text-slate-500 max-w-xs truncate"
                            title={s.purpose || ""}
                          >
                            {s.purpose || "-"}
                          </td>
                          <td className="py-3 text-xs text-slate-400 whitespace-nowrap">
                            <div>{s.filing_trigger_date}</div>
                            <a
                              href={getEdinetUrl(s.doc_id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700 font-medium transition-colors"
                            >
                              EDINET
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* ===== 報告履歴 ===== */}
          {shareholders.length > latestHolders.length && (
            <SectionCard title="報告履歴" badge={`${shareholders.length} 件`}>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-medium">書類種別</th>
                      <th className="pb-3 pr-4 font-medium">提出者</th>
                      <th className="pb-3 pr-4 font-medium">保有者</th>
                      <th className="pb-3 pr-4 text-right font-medium">
                        保有割合
                      </th>
                      <th className="pb-3 font-medium">提出日時</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {shareholders.slice(0, 50).map((s, i) => (
                      <tr
                        key={`hist-${i}`}
                        className="hover:bg-slate-50/80 text-xs"
                      >
                        <td className="py-2.5 pr-4 text-slate-500">
                          {s.document_title}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {s.filer_name}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-700">
                          {s.holder_name}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono">
                          {formatSharePct(s.total_holding_ratio)}
                        </td>
                        <td className="py-2.5 text-slate-400 whitespace-nowrap">
                          {s.submit_date_time?.substring(0, 10)}{" "}
                          <a
                            href={getEdinetUrl(s.doc_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-600 transition-colors"
                          >
                            ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ===== 競合企業 ===== */}
          <Suspense
            fallback={
              <SummarySectionSkeleton title="競合企業・業界" badge="自動検索" />
            }
          >
            <CompetitorSection
              companyName={company.name}
              industry={company.industry}
              aiEnabled={aiEnabled}
            />
          </Suspense>

          {/* ===== 評判・口コミ ===== */}
          <Suspense
            fallback={
              <SummarySectionSkeleton title="評判・口コミ" badge="自動検索" />
            }
          >
            <ReputationSection
              companyName={company.name}
              aiEnabled={aiEnabled}
            />
          </Suspense>

          {/* ===== Enriched sections (Suspense) ===== */}
          <Suspense
            fallback={
              <div className="space-y-6">
                <div className="shimmer h-32 rounded-2xl" />
                <div className="shimmer h-48 rounded-2xl" />
                <div className="shimmer h-28 rounded-2xl" />
              </div>
            }
          >
            <EnrichedSections
              name={company.name}
              companyUrl={wd?.officialWebsite}
              aiEnabled={aiEnabled}
            />
          </Suspense>

          {/* ===== 関連ニュース（ページ後段） ===== */}
          <Suspense
            fallback={
              <SummarySectionSkeleton title="関連ニュース" badge="自動検索" />
            }
          >
            <CompanyNewsSection
              companyName={company.name}
              aiEnabled={aiEnabled}
            />
          </Suspense>

          {/* ===== 外部リンク（ページ末尾） ===== */}
          <SectionCard title="外部リンク" badge="参考情報">
            <div className="flex flex-wrap gap-3">
              {company.sec_code && (
                <>
                  <ExternalLink
                    href={`https://finance.yahoo.co.jp/quote/${company.sec_code}.T`}
                  >
                    Yahoo! ファイナンス（株価）
                  </ExternalLink>
                  <ExternalLink
                    href={`https://kabutan.jp/stock/?code=${secCode}`}
                  >
                    株探（チャート・四季報）
                  </ExternalLink>
                  <ExternalLink
                    href={`https://www.nikkei.com/nkd/company/?scode=${secCode}`}
                  >
                    日経（企業情報）
                  </ExternalLink>
                  <ExternalLink href={`https://irbank.net/${secCode}`}>
                    IR BANK（IR・財務）
                  </ExternalLink>
                </>
              )}
              <ExternalLink
                href={`https://disclosure2.edinet-fsa.go.jp/WZEK0040.aspx?company=${company.edinet_code}`}
              >
                EDINET（開示書類）
              </ExternalLink>
              {f?.edinet_filing_url && (
                <ExternalLink href={f.edinet_filing_url}>
                  有価証券報告書
                </ExternalLink>
              )}
              {wd?.officialWebsite && (
                <ExternalLink href={wd.officialWebsite}>
                  公式サイト
                </ExternalLink>
              )}
              <ExternalLink
                href={`https://www.j-platpat.inpit.go.jp/c1800/PU/JP/jpn/applicant?applicant=${encodeURIComponent(company.name)}`}
              >
                J-PlatPat（特許）
              </ExternalLink>
            </div>
          </SectionCard>
        </CompanyAnalysisProvider>
      </div>
    );
  } catch (err) {
    console.error(`[CompanyPage] Failed to load ${code}:`, err);

    const isRateLimit = err instanceof EdinetApiError && err.status === 429;
    const isNotFound = err instanceof EdinetApiError && err.status === 404;
    const isNoKey = err instanceof Error && err.message === "NO_API_KEY";

    let title = "企業データの取得に失敗しました";
    let detail = "EDINETコードを確認してください。";

    if (isRateLimit) {
      title = "EDINET DB API のレート制限に達しました";
      detail =
        "無料プランの日次リクエスト上限（100 req/日）を超過しています。JST 午前0時にリセットされます。Proプランへのアップグレードもご検討ください。";
    } else if (isNotFound) {
      title = "該当する企業が見つかりません";
      detail = `EDINETコード「${code}」に対応する企業データがありません。`;
    } else if (isNoKey) {
      title = "EDINET API キーが設定されていません";
      detail = ".env の EDINET_API_KEY を確認してください。";
    } else if (err instanceof EdinetApiError) {
      detail = `EDINET DB API エラー (${err.status})`;
    }

    return (
      <div className="space-y-4">
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          戻る
        </Link>
        <div
          className={`rounded-2xl p-6 border ${
            isRateLimit
              ? "bg-amber-50 border-amber-200/60 text-amber-800"
              : "bg-red-50 border-red-200/60 text-red-700"
          }`}
        >
          <p className="font-semibold mb-1">{title}</p>
          <p className="text-sm opacity-90">{detail}</p>
          {isRateLimit && (
            <a
              href="https://edinetdb.jp/developers/upgrade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm font-medium text-amber-900 underline hover:text-amber-700"
            >
              Proプランの詳細 →
            </a>
          )}
        </div>
      </div>
    );
  }
}
