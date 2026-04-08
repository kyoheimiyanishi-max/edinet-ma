import {
  getCompany,
  getCompanyShareholders,
  getCompanyFinancials,
  formatYen,
  formatPct,
  formatSharePct,
  creditColor,
  changeColor,
  formatChange,
  getEdinetUrl,
} from "@/lib/edinetdb";
import type { FinancialHistory } from "@/lib/edinetdb";
import { fetchMarketSegment, fetchMarketCap } from "@/lib/market";
import { searchNews, formatPubDate } from "@/lib/news";
import ExpandableLinkList, {
  type LineItem,
} from "@/components/ExpandableLinkList";
import { summarizeItems } from "@/lib/summary";
import {
  enrichCompany,
  fetchWikidata,
  fetchExternalPatents,
  type EnrichResult,
  type EnrichSource,
  type WikidataInfo,
  type WebSearchResult,
} from "@/lib/enrich";
import {
  aggregateGroupCompanies,
  relationChipStyle,
  relationBadgeLetter,
  type GroupCompany,
} from "@/lib/group-companies";
import MaStrategyPanel from "@/components/MaStrategyPanel";
import { FinancialCharts } from "@/components/FinancialCharts";
import type { FinancialChartData } from "@/components/FinancialCharts";
import Link from "next/link";
import { Suspense } from "react";
import CompanyAnalysis from "@/components/CompanyAnalysis";
import AddToSellerButton from "@/components/AddToSellerButton";

interface Props {
  params: Promise<{ code: string }>;
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
  const title = [
    `${company.name} を検索`,
    company.ownershipPct != null ? `出資比率: ${company.ownershipPct}%` : "",
    company.description || "",
    `出典: ${company.sources.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <Link
      href={`/search?q=${encodeURIComponent(company.name)}`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${style}`}
      title={title}
    >
      <span className="text-[9px] px-1 py-0.5 rounded bg-white/60 font-bold tracking-wider">
        {letter}
      </span>
      <span>{company.name}</span>
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

async function CompanyNewsSection({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const items = await fetchNewsAndWebItems(
    [shortName, `${shortName} リリース`, `${shortName} サービス OR 事業`],
    [`${shortName} 企業情報`, `${shortName} ニュース`],
  );
  const aiSummary = await summarizeItems(items, `${shortName} の関連ニュース`);
  return (
    <SummarySectionCard
      title="関連ニュース"
      badge="自動検索"
      items={items}
      emptyText="関連ニュースなし"
      aiSummary={aiSummary}
    />
  );
}

async function MaNewsSection({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）/g, "").trim();
  const items = await fetchNewsAndWebItems(
    [
      `${shortName} M&A 買収`,
      `${shortName} 統合 合併`,
      `${shortName} TOB 公開買付`,
    ],
    [`${shortName} M&A`, `${shortName} 買収 合併`],
  );
  const aiSummary = await summarizeItems(
    items,
    `${shortName} のM&A関連ニュース`,
  );
  return (
    <SummarySectionCard
      title="M&A 関連ニュース"
      badge="自動検索"
      items={items}
      emptyText="M&A 関連ニュースなし"
      aiSummary={aiSummary}
    />
  );
}

async function CompetitorSection({
  companyName,
  industry,
}: {
  companyName: string;
  industry?: string;
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
  const aiSummary = await summarizeItems(
    items,
    `${shortName}（${industry ?? "業界不明"}）の競合・業界動向`,
  );

  if (industry) {
    items.unshift({
      title: `同業種「${industry}」の企業一覧を見る →`,
      url: `/search?source=edinet&industry=${encodeURIComponent(industry)}`,
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

async function ReputationSection({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const items = await fetchNewsAndWebItems(
    [
      `${shortName} 評判 口コミ 年収`,
      `${shortName} 働き方 ワークライフバランス`,
      `${shortName} OpenWork 転職`,
    ],
    [`${shortName} 評判 口コミ`, `${shortName} OpenWork`],
  );
  const aiSummary = await summarizeItems(
    items,
    `${shortName} の評判・口コミ・働き方`,
  );
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
}: {
  sectionTitle: string;
  sectionBadge: string;
  companyName: string;
  queries: string[];
  emptyText: string;
}) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const newsQueries = queries.map((q) => `${shortName} ${q.split(" OR ")[0]}`);
  const webQueries = queries.map((q) => `${shortName} ${q}`);
  const items = await fetchNewsAndWebItems(newsQueries, webQueries);
  const aiSummary = await summarizeItems(
    items,
    `${shortName} の${sectionTitle}`,
  );
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
}: {
  companyName: string;
  edinetCode?: string;
  wikidata?: WikidataInfo | null;
  description?: string;
}) {
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
}: {
  name: string;
  companyUrl?: string | null;
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
  const otherWebResults = enriched.webResults.filter(
    (r) =>
      !r.source.includes("wantedly") &&
      !jobResults.some((j) => j.url === r.url),
  );

  return (
    <>
      {/* 企業概要 */}
      {(enriched.wikipedia || enriched.websiteMeta?.description) && (
        <SectionCard
          title="企業概要"
          badge={enriched.wikipedia ? "Wikipedia" : "公式サイト"}
        >
          <p className="text-sm text-slate-700 leading-relaxed">
            {enriched.wikipedia?.description ||
              enriched.websiteMeta?.description}
          </p>
          <div className="mt-3">
            <SourceLink
              url={(enriched.wikipedia || enriched.websiteMeta)!.url}
              name={(enriched.wikipedia || enriched.websiteMeta)!.name}
            />
          </div>
        </SectionCard>
      )}

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
        />
      </Suspense>

      {/* 職場情報 */}
      <Suspense
        fallback={<SummarySectionSkeleton title="職場情報" badge="自動取得" />}
      >
        <WebFallbackSection
          sectionTitle="職場情報"
          sectionBadge="自動取得"
          companyName={name}
          queries={[
            "年収 OR 給与 OR 待遇 OR 福利厚生",
            "働き方 OR ワークライフバランス OR 残業",
          ]}
          emptyText="職場情報なし"
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

      {/* プレスリリース */}
      {enriched.pressReleases.length > 0 && (
        <SectionCard
          title="プレスリリース"
          badge={`${enriched.pressReleases.length} 件`}
        >
          <div className="space-y-2">
            {enriched.pressReleases.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
              >
                <p className="text-sm text-slate-800 font-medium line-clamp-2">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                    {item.name}
                  </span>
                  {item.date && (
                    <span className="text-[10px] text-slate-400">
                      {item.date}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Web上の情報 */}
      {otherWebResults.length > 0 && (
        <SectionCard
          title="Web上の情報"
          badge={`${otherWebResults.length} 件 自動取得`}
        >
          <div className="space-y-2">
            {otherWebResults.map((r, i) => (
              <WebResultCard key={i} result={r} />
            ))}
          </div>
        </SectionCard>
      )}

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

export default async function CompanyPage({ params }: Props) {
  const { code } = await params;

  try {
    const [company, shareholders, financials] = await Promise.all([
      getCompany(code),
      getCompanyShareholders(code),
      getCompanyFinancials(code),
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
              <h2 className="text-2xl font-bold text-slate-800">
                {company.name}
              </h2>
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
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-3.5 py-1.5 rounded-full text-sm font-bold shadow-sm ${creditColor(company.credit_rating)}`}
              >
                {company.credit_rating} ({company.credit_score}pt)
              </span>
              {marketCap != null && (
                <span className="text-xs text-slate-500">
                  時価総額: {formatYen(marketCap)}
                </span>
              )}
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

        {/* ===== サマリー ===== */}
        <SectionCard title="サマリー" badge="主要指標">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400 mb-1.5 font-medium">
                会社概要
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {wd?.description
                  ? wd.description
                  : `${company.name}（${company.industry}）`}
              </p>
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
                value={marketCap != null ? formatYen(marketCap) : "-"}
                sub={
                  company.market_cap == null && marketCap != null
                    ? "kabutan"
                    : undefined
                }
              />
              <MetricCard
                label="売上高"
                value={f?.revenue != null ? formatYen(f.revenue) : "-"}
                sub={f ? `${f.fiscal_year}年度` : undefined}
              />
              <MetricCard
                label="現預金"
                value={f?.cash != null ? formatYen(f.cash) : "-"}
                sub={f ? `${f.fiscal_year}年度` : undefined}
              />
              <MetricCard
                label="純利益"
                value={f?.net_income != null ? formatYen(f.net_income) : "-"}
                sub={f ? `${f.fiscal_year}年度` : undefined}
              />
            </div>
          </div>
        </SectionCard>

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
            />
          </Suspense>
        </SectionCard>

        {/* ===== 関連ニュース ===== */}
        <Suspense
          fallback={
            <SummarySectionSkeleton title="関連ニュース" badge="自動検索" />
          }
        >
          <CompanyNewsSection companyName={company.name} />
        </Suspense>

        {/* ===== M&A 関連ニュース ===== */}
        <Suspense
          fallback={
            <SummarySectionSkeleton title="M&A 関連ニュース" badge="自動検索" />
          }
        >
          <MaNewsSection companyName={company.name} />
        </Suspense>

        {/* AI Analysis: Overview, Business Model, Officers, M&A, Strategy */}
        <Suspense
          fallback={
            <div className="space-y-6">
              <SummarySectionSkeleton title="会社概要" badge="Claude AI" />
              <SummarySectionSkeleton
                title="事業モデル・銘柄特徴"
                badge="Claude AI"
              />
              <SummarySectionSkeleton title="主要役員" badge="Claude AI" />
              <SummarySectionSkeleton title="M&A 買収一覧" badge="Claude AI" />
            </div>
          }
        >
          <CompanyAnalysis
            edinetCode={company.edinet_code}
            companyName={company.name}
          />
        </Suspense>

        {/* ===== AI M&A 戦略推察 ===== */}
        <SectionCard title="AI M&A 戦略推察" badge="Claude AI">
          <MaStrategyPanel
            company={{
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
          />
        </SectionCard>

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
          <SectionCard title="損益計算書 (P/L)" badge={`${f.fiscal_year}年度`}>
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
          </SectionCard>
        )}

        {/* ===== B/S ===== */}
        {f && (
          <SectionCard title="貸借対照表 (B/S)" badge={`${f.fiscal_year}年度`}>
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
              {f.total_assets != null && f.equity != null && f.equity !== 0 && (
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
          {latestHolders.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs text-slate-400 font-medium">
                保有比率トップ5
              </p>
              {latestHolders.slice(0, 5).map((h, i) => {
                const pct = h.total_holding_ratio * 100;
                const delta = h.holding_ratio - h.holding_ratio_previous;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 sm:w-48 text-xs text-slate-700 truncate shrink-0 font-medium">
                      {h.holder_name}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(pct * 2, 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-slate-700">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono w-16 text-right shrink-0 ${changeColor(delta)}`}
                    >
                      {delta !== 0
                        ? (delta > 0 ? "+" : "") +
                          (delta * 100).toFixed(2) +
                          "%"
                        : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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
                    <th className="pb-3 pr-4 font-medium text-right">前回比</th>
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

        {/* ===== SNSリンク ===== */}
        <SectionCard title="SNS・外部プロフィール" badge="自動生成">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {[
              {
                name: "LinkedIn",
                url: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(company.name)}`,
              },
              {
                name: "X (Twitter)",
                url: `https://x.com/search?q=${encodeURIComponent(company.name)}&f=user`,
              },
              {
                name: "Facebook",
                url: `https://www.facebook.com/search/pages/?q=${encodeURIComponent(company.name)}`,
              },
              {
                name: "OpenWork",
                url: `https://www.vorkers.com/company_list?field=&pref=&src_str=${encodeURIComponent(company.name)}`,
              },
              {
                name: "転職会議",
                url: `https://jobtalk.jp/companies/search?q=${encodeURIComponent(company.name)}`,
              },
              {
                name: "GitHub",
                url: `https://github.com/search?q=${encodeURIComponent(company.name)}&type=users`,
              },
              {
                name: "note",
                url: `https://note.com/search?q=${encodeURIComponent(company.name)}&context=note`,
              },
              {
                name: "YouTube",
                url: `https://www.youtube.com/results?search_query=${encodeURIComponent(company.name)}`,
              },
            ].map((link, i) => (
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

        {/* ===== 競合企業 ===== */}
        <Suspense
          fallback={
            <SummarySectionSkeleton title="競合企業・業界" badge="自動検索" />
          }
        >
          <CompetitorSection
            companyName={company.name}
            industry={company.industry}
          />
        </Suspense>

        {/* ===== 評判・口コミ ===== */}
        <Suspense
          fallback={
            <SummarySectionSkeleton title="評判・口コミ" badge="自動検索" />
          }
        >
          <ReputationSection companyName={company.name} />
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
              <ExternalLink href={wd.officialWebsite}>公式サイト</ExternalLink>
            )}
            <ExternalLink
              href={`https://www.j-platpat.inpit.go.jp/c1800/PU/JP/jpn/applicant?applicant=${encodeURIComponent(company.name)}`}
            >
              J-PlatPat（特許）
            </ExternalLink>
          </div>
        </SectionCard>
      </div>
    );
  } catch {
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
        <div className="bg-red-50 border border-red-200/60 rounded-2xl p-6 text-red-700">
          企業データの取得に失敗しました。EDINETコードを確認してください。
        </div>
      </div>
    );
  }
}
