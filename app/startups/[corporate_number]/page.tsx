import {
  getCompany,
  getSubsidy,
  getPatent,
  getCertification,
  getFinance,
  getWorkplace,
  getCommendation,
  kindLabel,
  formatCapital,
  formatEstablished,
  yearsOld,
  formatMajorShareholders,
  type FinanceItem,
  type WorkplaceItem,
  type CommendationItem,
} from "@/lib/gbiz";
import {
  enrichCompany,
  fetchWikidata,
  fetchExternalPatents,
  generateReferenceLinks,
  type EnrichResult,
  type EnrichSource,
} from "@/lib/enrich";
import { searchNews, formatPubDate } from "@/lib/news";
import CompanyEmployeeSection from "@/components/CompanyEmployeeSection";
import { FinancialCharts } from "@/components/FinancialCharts";
import type { FinancialChartData } from "@/components/FinancialCharts";
import Link from "next/link";
import { Suspense } from "react";

interface Props {
  params: Promise<{ corporate_number: string }>;
}

// ---- Shared UI components ----

function InfoCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <div className="text-sm font-semibold mt-1 text-slate-800">
        {children}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        {badge && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {badge}
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </section>
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
      className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors"
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

function NewsRow({ item }: { item: EnrichSource }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
    >
      <p className="text-sm text-slate-800 font-medium line-clamp-2">
        {item.title}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
          {item.name}
        </span>
        {item.date && (
          <span className="text-[10px] text-slate-400">{item.date}</span>
        )}
      </div>
    </a>
  );
}

// ---- News section (Suspense) — falls back to DuckDuckGo ----

async function CompanyNewsSection({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();

  // 複数クエリで Google News RSS を並列検索して統合
  const [r1, r2, r3] = await Promise.allSettled([
    searchNews(shortName),
    searchNews(`${shortName} リリース`),
    searchNews(`${shortName} サービス`),
  ]);
  const allNews = [
    ...(r1.status === "fulfilled" ? r1.value : []),
    ...(r2.status === "fulfilled" ? r2.value : []),
    ...(r3.status === "fulfilled" ? r3.value : []),
  ];
  // Deduplicate
  const seen = new Set<string>();
  const news = allNews.filter((n) => {
    const key = n.title.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (news.length > 0) {
    return (
      <div className="space-y-2">
        {news.slice(0, 8).map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {item.source && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                  {item.source}
                </span>
              )}
              {item.pubDate && (
                <span className="text-[10px] text-slate-400">
                  {formatPubDate(item.pubDate)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    );
  }

  // Fallback: DuckDuckGo multi-query web search
  const { fetchMultiWebSearch } = await import("@/lib/enrich");
  const webResults = await fetchMultiWebSearch([
    `"${shortName}"`,
    `"${shortName}" ニュース OR プレスリリース OR リリース`,
    `"${shortName}" サービス OR プロダクト OR 事業`,
  ]).catch(() => []);
  if (webResults.length > 0) {
    return (
      <div className="space-y-2">
        {webResults.slice(0, 5).map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {r.title}
            </p>
            {r.snippet && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {r.snippet}
              </p>
            )}
            <div className="mt-1.5">
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                {r.source}
              </span>
            </div>
          </a>
        ))}
      </div>
    );
  }

  return (
    <p className="text-sm text-slate-400 text-center py-4">関連ニュースなし</p>
  );
}

async function FundingNewsSection({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();

  const [r1, r2, r3] = await Promise.allSettled([
    searchNews(`${shortName} 資金調達 OR 調達額`),
    searchNews(`${shortName} 売上 OR 業績 OR 決算`),
    searchNews(`${shortName} 出資 OR 投資 OR IPO`),
  ]);
  const allNews = [
    ...(r1.status === "fulfilled" ? r1.value : []),
    ...(r2.status === "fulfilled" ? r2.value : []),
    ...(r3.status === "fulfilled" ? r3.value : []),
  ];
  const seen = new Set<string>();
  const news = allNews.filter((n) => {
    const key = n.title.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (news.length > 0) {
    return (
      <div className="space-y-2">
        {news.slice(0, 5).map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {item.source && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                  {item.source}
                </span>
              )}
              {item.pubDate && (
                <span className="text-[10px] text-slate-400">
                  {formatPubDate(item.pubDate)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    );
  }

  // Fallback: DuckDuckGo multi-query search for funding/financial info
  const { fetchMultiWebSearch } = await import("@/lib/enrich");
  const webResults = await fetchMultiWebSearch([
    `"${shortName}" 資金調達 OR 調達額 OR シリーズ`,
    `"${shortName}" 売上 OR 業績 OR 決算 OR 成長`,
    `"${shortName}" 出資 OR 投資 OR VC OR ファンド`,
  ]).catch(() => []);
  if (webResults.length > 0) {
    return (
      <div className="space-y-2">
        {webResults.slice(0, 5).map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {r.title}
            </p>
            {r.snippet && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {r.snippet}
              </p>
            )}
            <div className="mt-1.5">
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                {r.source}
              </span>
            </div>
          </a>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-slate-400 text-center py-4">データなし</p>;
}

// ---- Fallback components for empty sections ----

async function SubsidyFallback({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  // Google News RSS first
  const newsResults = await searchNews(`${shortName} 補助金 助成金`).catch(
    () => [],
  );
  if (newsResults.length > 0) {
    return (
      <div className="space-y-2">
        {newsResults.slice(0, 5).map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {item.source && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                  {item.source}
                </span>
              )}
              {item.pubDate && (
                <span className="text-[10px] text-slate-400">
                  {formatPubDate(item.pubDate)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    );
  }
  // DuckDuckGo fallback (no quotes)
  const { fetchMultiWebSearch } = await import("@/lib/enrich");
  const results = await fetchMultiWebSearch([
    `${shortName} 補助金 助成金 採択`,
    `${shortName} 支援 NEDO JST 経産省`,
  ]).catch(() => []);

  if (results.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">データなし</p>
    );
  }

  return (
    <div className="space-y-2">
      {results.slice(0, 5).map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
        >
          <p className="text-sm text-slate-800 font-medium line-clamp-2">
            {r.title}
          </p>
          {r.snippet && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {r.snippet}
            </p>
          )}
          <div className="mt-1.5">
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
              {r.source}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

async function CertFallback({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const newsResults = await searchNews(`${shortName} 認定 表彰 受賞`).catch(
    () => [],
  );
  if (newsResults.length > 0) {
    return (
      <div className="space-y-2">
        {newsResults.slice(0, 5).map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {item.source && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                  {item.source}
                </span>
              )}
              {item.pubDate && (
                <span className="text-[10px] text-slate-400">
                  {formatPubDate(item.pubDate)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    );
  }
  const { fetchMultiWebSearch } = await import("@/lib/enrich");
  const results = await fetchMultiWebSearch([
    `${shortName} 認定 届出 ISO`,
    `${shortName} 受賞 表彰 アワード`,
  ]).catch(() => []);

  if (results.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">データなし</p>
    );
  }

  return (
    <div className="space-y-2">
      {results.slice(0, 5).map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
        >
          <p className="text-sm text-slate-800 font-medium line-clamp-2">
            {r.title}
          </p>
          {r.snippet && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {r.snippet}
            </p>
          )}
          <div className="mt-1.5">
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
              {r.source}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

async function OfficerFallback({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const newsResults = await searchNews(`${shortName} 代表 取締役 役員`).catch(
    () => [],
  );
  if (newsResults.length > 0) {
    return (
      <div className="space-y-2">
        {newsResults.slice(0, 5).map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {item.source && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                  {item.source}
                </span>
              )}
              {item.pubDate && (
                <span className="text-[10px] text-slate-400">
                  {formatPubDate(item.pubDate)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    );
  }
  const { fetchMultiWebSearch } = await import("@/lib/enrich");
  const results = await fetchMultiWebSearch([
    `${shortName} 代表 CEO 取締役 役員`,
    `${shortName} 経営陣 チーム メンバー`,
  ]).catch(() => []);

  if (results.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">データなし</p>
    );
  }
  return (
    <div className="space-y-2">
      {results.slice(0, 5).map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
        >
          <p className="text-sm text-slate-800 font-medium line-clamp-2">
            {r.title}
          </p>
          {r.snippet && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {r.snippet}
            </p>
          )}
          <div className="mt-1.5">
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
              {r.source}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

async function ShareholderFallback({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const newsResults = await searchNews(
    `${shortName} 株主 出資 投資 資金調達`,
  ).catch(() => []);
  if (newsResults.length > 0) {
    return (
      <div className="space-y-2">
        {newsResults.slice(0, 5).map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {item.source && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                  {item.source}
                </span>
              )}
              {item.pubDate && (
                <span className="text-[10px] text-slate-400">
                  {formatPubDate(item.pubDate)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    );
  }
  const { fetchMultiWebSearch } = await import("@/lib/enrich");
  const results = await fetchMultiWebSearch([
    `${shortName} 株主 出資者 投資家 VC`,
    `${shortName} 資金調達 ラウンド シリーズ`,
  ]).catch(() => []);

  if (results.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">データなし</p>
    );
  }
  return (
    <div className="space-y-2">
      {results.slice(0, 5).map((r, i) => (
        <a
          key={i}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
        >
          <p className="text-sm text-slate-800 font-medium line-clamp-2">
            {r.title}
          </p>
          {r.snippet && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {r.snippet}
            </p>
          )}
          <div className="mt-1.5">
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
              {r.source}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

// ---- Competitor & Reputation sections ----

async function CompetitorStartupSection({
  companyName,
  industry,
}: {
  companyName: string;
  industry?: string;
}) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const newsResults = await searchNews(`${shortName} 競合 ライバル 比較`).catch(
    () => [],
  );
  return (
    <div className="space-y-2">
      {industry && (
        <a
          href={`/search?listed=unlisted&q=${encodeURIComponent(industry)}`}
          className="block p-3 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-50 transition-all text-sm text-purple-700 font-medium"
        >
          同業種「{industry}」の企業を検索 →
        </a>
      )}
      {newsResults.length > 0
        ? newsResults.slice(0, 5).map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
            >
              <p className="text-sm text-slate-800 font-medium line-clamp-2">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                {item.source && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                    {item.source}
                  </span>
                )}
              </div>
            </a>
          ))
        : !industry && (
            <p className="text-sm text-slate-400 text-center py-2">
              データなし
            </p>
          )}
    </div>
  );
}

async function ReputationStartupSection({
  companyName,
}: {
  companyName: string;
}) {
  const shortName = companyName.replace(/株式会社|（株）|有限会社/g, "").trim();
  const newsResults = await searchNews(
    `${shortName} 評判 口コミ 年収 働き方`,
  ).catch(() => []);
  if (newsResults.length > 0) {
    return (
      <div className="space-y-2">
        {newsResults.slice(0, 5).map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              {item.source && (
                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                  {item.source}
                </span>
              )}
              {item.pubDate && (
                <span className="text-[10px] text-slate-400">
                  {formatPubDate(item.pubDate)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    );
  }
  const { fetchMultiWebSearch } = await import("@/lib/enrich");
  const results = await fetchMultiWebSearch([
    `${shortName} 評判 口コミ 年収`,
    `${shortName} OpenWork 転職会議`,
  ]).catch(() => []);
  if (results.length > 0) {
    return (
      <div className="space-y-2">
        {results.slice(0, 5).map((r, i) => (
          <a
            key={i}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
          >
            <p className="text-sm text-slate-800 font-medium line-clamp-2">
              {r.title}
            </p>
            {r.snippet && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {r.snippet}
              </p>
            )}
            <div className="mt-1.5">
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                {r.source}
              </span>
            </div>
          </a>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-slate-400 text-center py-4">データなし</p>;
}

// ---- Enriched sections (streamed via Suspense) ----

async function EnrichedSections({
  name,
  corporateNumber,
  location,
  companyUrl,
  hasDescription,
}: {
  name: string;
  corporateNumber: string;
  location?: string;
  companyUrl?: string | null;
  hasDescription: boolean;
}) {
  let enriched: EnrichResult;
  try {
    enriched = await enrichCompany({
      name,
      corporateNumber,
      location,
      companyUrl,
    });
  } catch {
    enriched = {
      companyName: name,
      news: [],
      wikipedia: null,
      websiteMeta: null,
      pressReleases: [],
      webResults: [],
      referenceLinks: generateReferenceLinks(name, corporateNumber, location),
      noteArticles: [],
    };
  }

  // Categorize web results by source type
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

  // Build company overview from all sources
  const overviewParts: string[] = [];
  if (!hasDescription && enriched.wikipedia?.description)
    overviewParts.push(enriched.wikipedia.description);
  if (!hasDescription && enriched.websiteMeta?.description)
    overviewParts.push(enriched.websiteMeta.description);

  // Source for overview
  const overviewSource = enriched.wikipedia || enriched.websiteMeta;

  return (
    <>
      {/* ===== 企業概要 (from Wikipedia / website meta) ===== */}
      {overviewParts.length > 0 && overviewSource && (
        <SectionCard title="企業概要" badge={overviewSource.name}>
          <p className="text-sm text-slate-700 leading-relaxed">
            {overviewParts[0]}
          </p>
          <div className="mt-3">
            <SourceLink url={overviewSource.url} name={overviewSource.name} />
          </div>
        </SectionCard>
      )}

      {/* ===== 事業内容 (from website body scraping) ===== */}
      {enriched.websiteMeta?.bodyText && (
        <SectionCard title="事業内容" badge="公式サイトから取得">
          <div className="space-y-3">
            {enriched.websiteMeta.bodyText
              .split("\n\n")
              .filter((t) => t.trim())
              .map((paragraph, i) => (
                <p key={i} className="text-sm text-slate-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
          </div>
          <div className="mt-4">
            <SourceLink url={enriched.websiteMeta.url} name="公式サイト" />
          </div>
        </SectionCard>
      )}

      {/* ===== 採用・カルチャー (Wantedly data) ===== */}
      {wantedlyResults.length > 0 && (
        <SectionCard title="採用・カルチャー" badge="Wantedly">
          <div className="space-y-2.5">
            {wantedlyResults.map((r, i) => (
              <WebResultCard key={i} result={r} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ===== 求人情報 (from job sites) ===== */}
      {jobResults.length > 0 && (
        <SectionCard title="求人情報" badge={`${jobResults.length} 件`}>
          <div className="space-y-2.5">
            {jobResults.map((r, i) => (
              <WebResultCard key={i} result={r} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ===== Web情報 (other web results) ===== */}
      {otherWebResults.length > 0 && (
        <SectionCard
          title="Web上の情報"
          badge={`${otherWebResults.length} 件 自動取得`}
        >
          <div className="space-y-2.5">
            {otherWebResults.map((r, i) => (
              <WebResultCard key={i} result={r} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ===== プレスリリース ===== */}
      {enriched.pressReleases.length > 0 && (
        <SectionCard
          title="プレスリリース"
          badge={`${enriched.pressReleases.length} 件`}
        >
          <div className="space-y-2">
            {enriched.pressReleases.map((item, i) => (
              <NewsRow key={i} item={item} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* ===== 関連リンク ===== */}
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
              className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-purple-50 hover:border-purple-200 transition-all text-sm group"
            >
              <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-purple-400 transition-colors shrink-0" />
              <span className="text-slate-700 group-hover:text-purple-700 font-medium truncate transition-colors">
                {link.name}
              </span>
              <svg
                className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-400 shrink-0 ml-auto transition-colors"
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
    </>
  );
}

function WebResultCard({
  result,
}: {
  result: import("@/lib/enrich").WebSearchResult;
}) {
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3.5 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
    >
      <p className="text-sm text-slate-800 font-medium line-clamp-2">
        {result.title}
      </p>
      {result.snippet && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
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

function EnrichedSkeleton() {
  return (
    <div className="space-y-6">
      <div className="shimmer h-32 rounded-2xl" />
      <div className="shimmer h-28 rounded-2xl" />
    </div>
  );
}

// ---- Main page ----

export default async function StartupDetailPage({ params }: Props) {
  const { corporate_number } = await params;

  try {
    // Phase 1: All gBizINFO endpoints in parallel (all with catch for resilience)
    const [compRes, subsidyRes, patentRes, certRes, finRes, wpRes, commRes] =
      await Promise.all([
        getCompany(corporate_number),
        getSubsidy(corporate_number).catch(() => null),
        getPatent(corporate_number).catch(() => null),
        getCertification(corporate_number).catch(() => null),
        getFinance(corporate_number).catch(() => null),
        getWorkplace(corporate_number).catch(() => null),
        getCommendation(corporate_number).catch(() => null),
      ]);

    const c = compRes["hojin-infos"]?.[0];
    if (!c) throw new Error("not found");

    const subsidies = subsidyRes?.["hojin-infos"]?.[0]?.subsidy || [];
    const gbizPatents = patentRes?.["hojin-infos"]?.[0]?.patent || [];
    const certifications = certRes?.["hojin-infos"]?.[0]?.certification || [];
    const rawFinance = finRes?.["hojin-infos"]?.[0]?.finance;
    const rawFinArr = Array.isArray(rawFinance)
      ? rawFinance
      : rawFinance
        ? [rawFinance]
        : [];
    // Sanitize: extract only known safe scalar fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finances: FinanceItem[] = rawFinArr.map((f: any) => ({
      fiscal_year_cover_page:
        typeof f.fiscal_year_cover_page === "string"
          ? f.fiscal_year_cover_page
          : undefined,
      accounting_standards:
        typeof f.accounting_standards === "string"
          ? f.accounting_standards
          : undefined,
      net_sales: typeof f.net_sales === "number" ? f.net_sales : null,
      operating_revenue:
        typeof f.operating_revenue === "number" ? f.operating_revenue : null,
      ordinary_income:
        typeof f.ordinary_income === "number" ? f.ordinary_income : null,
      net_income: typeof f.net_income === "number" ? f.net_income : null,
      total_assets: typeof f.total_assets === "number" ? f.total_assets : null,
      net_assets: typeof f.net_assets === "number" ? f.net_assets : null,
      capital_stock_summary:
        typeof f.capital_stock_summary === "number"
          ? f.capital_stock_summary
          : null,
      number_of_employees:
        typeof f.number_of_employees === "number"
          ? f.number_of_employees
          : null,
      major_shareholders: f.major_shareholders,
      date_of_general_meeting:
        typeof f.date_of_general_meeting === "string"
          ? f.date_of_general_meeting
          : null,
    }));
    const rawWorkplace = wpRes?.["hojin-infos"]?.[0]?.workplace_info;
    const workplaces: WorkplaceItem[] = Array.isArray(rawWorkplace)
      ? rawWorkplace
      : rawWorkplace
        ? [rawWorkplace]
        : [];
    const rawCommendation = commRes?.["hojin-infos"]?.[0]?.commendation;
    const commendations: CommendationItem[] = Array.isArray(rawCommendation)
      ? rawCommendation
      : rawCommendation
        ? [rawCommendation]
        : [];

    // Phase 2: Wikidata + external patents (parallel)
    const [wd, externalPatents] = await Promise.all([
      fetchWikidata(c.name).catch(() => null),
      gbizPatents.length === 0
        ? fetchExternalPatents(c.name).catch(() => [])
        : Promise.resolve([]),
    ]);

    // Fill gaps with Wikidata
    const establishedDate = c.date_of_establishment || wd?.inceptionDate;
    const age = yearsOld(establishedDate ?? null);
    const description = c.business_summary || wd?.description || null;
    const descriptionSource =
      !c.business_summary && wd?.description ? wd : null;
    const latestFinance =
      finances.length > 0 ? finances[finances.length - 1] : null;
    const majorShareholdersText = formatMajorShareholders(
      latestFinance?.major_shareholders,
    );
    const workplaceBase =
      workplaces.length > 0 ? workplaces[0]?.base_infos : null;

    // Build chart data from multi-year gBizINFO finance + Wikidata fallback
    const chartData: FinancialChartData[] = finances
      .filter(
        (f) =>
          f.fiscal_year_cover_page &&
          (f.net_sales != null ||
            f.total_assets != null ||
            f.net_assets != null),
      )
      .map((f) => {
        const yearMatch = f.fiscal_year_cover_page?.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0], 10) : 0;
        return {
          fiscal_year: year,
          revenue: f.net_sales ?? f.operating_revenue ?? null,
          operating_income: f.ordinary_income ?? null,
          net_income: f.net_income ?? null,
          total_assets: f.total_assets ?? null,
          equity: f.net_assets ?? null,
          cash: null,
        };
      })
      .filter((d) => d.fiscal_year > 0)
      .sort((a, b) => a.fiscal_year - b.fiscal_year);

    // If no gBizINFO chart data but Wikidata has financials, create single-year entry
    if (
      chartData.length === 0 &&
      (wd?.revenue || wd?.totalAssets || wd?.netIncome)
    ) {
      chartData.push({
        fiscal_year: new Date().getFullYear(),
        revenue: wd?.revenue ?? null,
        operating_income: wd?.operatingIncome ?? null,
        net_income: wd?.netIncome ?? null,
        total_assets: wd?.totalAssets ?? null,
        equity: null,
        cash: null,
      });
    }

    const hasFinancialData =
      latestFinance ||
      wd?.revenue ||
      wd?.totalAssets ||
      wd?.operatingIncome ||
      wd?.netIncome;

    return (
      <div className="space-y-6">
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
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
          検索に戻る
        </Link>

        {/* ===== Header ===== */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{c.name}</h2>
              {c.kana && (
                <p className="text-sm text-slate-400 mt-0.5">{c.kana}</p>
              )}
              {c.name_en && (
                <p className="text-sm text-slate-500">{c.name_en}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded-lg text-slate-500">
                  {c.corporate_number}
                </span>
                <span className="text-xs px-2 py-1 bg-purple-50 rounded-lg text-purple-600">
                  {kindLabel(c.kind)}
                </span>
                {wd?.industry && (
                  <span className="text-xs px-2 py-1 bg-blue-50 rounded-lg text-blue-600">
                    {wd.industry}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-2">{c.location}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {age !== null && (
                <span
                  className={`px-3.5 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                    age <= 3
                      ? "bg-purple-100 text-purple-700"
                      : age <= 7
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {age <= 3 ? "創業期" : age <= 7 ? "成長期" : ""} 設立 {age} 年
                </span>
              )}
            </div>
          </div>

          {description && (
            <div className="mt-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
              {description}
              {descriptionSource && (
                <div className="mt-2">
                  <SourceLink
                    url={descriptionSource.sourceUrl}
                    name="Wikidata"
                  />
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <InfoCard label="設立年月日">
              {establishedDate ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  {formatEstablished(establishedDate)}
                  {!c.date_of_establishment && wd?.inceptionDate && (
                    <SourceLink url={wd.sourceUrl} name="Wikidata" />
                  )}
                </span>
              ) : (
                "-"
              )}
            </InfoCard>
            <InfoCard label="資本金">{formatCapital(c.capital_stock)}</InfoCard>
            <InfoCard label="従業員数">
              {c.employee_number != null ? (
                `${c.employee_number}人`
              ) : wd?.employeeCount ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  {wd.employeeCount.toLocaleString()}人
                  <SourceLink url={wd.sourceUrl} name="Wikidata" />
                </span>
              ) : (
                "-"
              )}
            </InfoCard>
            <InfoCard
              label={
                c.representative_name
                  ? "代表者"
                  : wd?.founder
                    ? "創業者"
                    : "代表者"
              }
            >
              {c.representative_name || wd?.founder ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  {c.representative_name || wd?.founder}
                  {!c.representative_name && wd?.founder && (
                    <SourceLink url={wd.sourceUrl} name="Wikidata" />
                  )}
                </span>
              ) : (
                "-"
              )}
            </InfoCard>
          </div>

          {(c.company_url ||
            c.company_size_male != null ||
            c.company_size_female != null) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {c.company_url && (
                <InfoCard label="ウェブサイト">
                  <a
                    href={
                      c.company_url.startsWith("http")
                        ? c.company_url
                        : `https://${c.company_url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-normal truncate block transition-colors"
                  >
                    {c.company_url}
                  </a>
                </InfoCard>
              )}
              {(c.company_size_male != null ||
                c.company_size_female != null) && (
                <InfoCard label="男女内訳">
                  男: {c.company_size_male ?? "-"} / 女:{" "}
                  {c.company_size_female ?? "-"}
                </InfoCard>
              )}
            </div>
          )}
        </div>

        {/* ===== External Links ===== */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <div className="flex flex-wrap gap-3">
            {c.company_url && (
              <ExternalLink
                href={
                  c.company_url.startsWith("http")
                    ? c.company_url
                    : `https://${c.company_url}`
                }
              >
                公式サイト
              </ExternalLink>
            )}
            <ExternalLink
              href={`https://www.houjin-bangou.nta.go.jp/henkorireki-johoto.html?selHouzinNo=${c.corporate_number}`}
            >
              国税庁（法人番号）
            </ExternalLink>
            <ExternalLink
              href={`https://info.gbiz.go.jp/hojin/ichiran?hojinBango=${c.corporate_number}`}
            >
              gBizINFO
            </ExternalLink>
            <ExternalLink
              href={`https://www.wantedly.com/search?q=${encodeURIComponent(c.name)}&t=company`}
            >
              Wantedly
            </ExternalLink>
            <ExternalLink
              href={`https://startup-db.com/community/companies?keyword=${encodeURIComponent(c.name)}`}
            >
              STARTUP DB
            </ExternalLink>
            <ExternalLink
              href={`https://initial.inc/companies?q=${encodeURIComponent(c.name)}`}
            >
              INITIAL
            </ExternalLink>
            <ExternalLink
              href={`https://www.j-platpat.inpit.go.jp/c1800/PU/JP/jpn/applicant?applicant=${encodeURIComponent(c.name)}`}
            >
              J-PlatPat（特許）
            </ExternalLink>
          </div>
        </div>

        {/* ===== Assigned Employees ===== */}
        <SectionCard title="担当社員" badge="社員管理">
          <CompanyEmployeeSection
            companyCode={c.corporate_number}
            companyName={c.name}
          />
        </SectionCard>

        {/* ===== Company News ===== */}
        <SectionCard title="関連ニュース" badge="自動検索">
          <Suspense fallback={<div className="shimmer h-32 rounded-xl" />}>
            <CompanyNewsSection companyName={c.name} />
          </Suspense>
        </SectionCard>

        {/* ===== Financial Charts ===== */}
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

        {/* ===== P/L 損益計算書 ===== */}
        <SectionCard
          title="損益計算書 (P/L)"
          badge={
            latestFinance?.fiscal_year_cover_page ||
            (hasFinancialData ? "Wikidata" : "")
          }
        >
          {hasFinancialData ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <InfoCard label="売上高">
                <span className="flex items-center gap-1.5 flex-wrap">
                  {formatCapital(
                    latestFinance?.net_sales ?? wd?.revenue ?? null,
                  )}
                  {!latestFinance?.net_sales && wd?.revenue && (
                    <SourceLink url={wd.sourceUrl} name="Wikidata" />
                  )}
                </span>
              </InfoCard>
              <InfoCard label="営業利益">
                <span className="flex items-center gap-1.5 flex-wrap">
                  {formatCapital(
                    latestFinance?.operating_revenue ??
                      wd?.operatingIncome ??
                      null,
                  )}
                  {!latestFinance?.operating_revenue && wd?.operatingIncome && (
                    <SourceLink url={wd.sourceUrl} name="Wikidata" />
                  )}
                </span>
              </InfoCard>
              {latestFinance?.ordinary_income != null && (
                <InfoCard label="経常利益">
                  {formatCapital(latestFinance.ordinary_income)}
                </InfoCard>
              )}
              <InfoCard label="純利益">
                <span className="flex items-center gap-1.5 flex-wrap">
                  {formatCapital(
                    latestFinance?.net_income ?? wd?.netIncome ?? null,
                  )}
                  {!latestFinance?.net_income && wd?.netIncome && (
                    <SourceLink url={wd.sourceUrl} name="Wikidata" />
                  )}
                </span>
              </InfoCard>
              {latestFinance?.number_of_employees != null && (
                <InfoCard label="従業員数（決算時）">
                  {latestFinance.number_of_employees.toLocaleString()}人
                </InfoCard>
              )}
            </div>
          ) : (
            <Suspense
              fallback={
                <p className="text-sm text-slate-400 text-center py-4">
                  検索中...
                </p>
              }
            >
              <FundingNewsSection companyName={c.name} />
            </Suspense>
          )}
        </SectionCard>

        {/* ===== B/S 貸借対照表 ===== */}
        <SectionCard
          title="貸借対照表 (B/S)"
          badge={
            latestFinance?.fiscal_year_cover_page ||
            (wd?.totalAssets ? "Wikidata" : "")
          }
        >
          {latestFinance || wd?.totalAssets ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <InfoCard label="総資産">
                <span className="flex items-center gap-1.5 flex-wrap">
                  {formatCapital(
                    latestFinance?.total_assets ?? wd?.totalAssets ?? null,
                  )}
                  {!latestFinance?.total_assets && wd?.totalAssets && (
                    <SourceLink url={wd.sourceUrl} name="Wikidata" />
                  )}
                </span>
              </InfoCard>
              {latestFinance?.net_assets != null && (
                <InfoCard label="純資産">
                  {formatCapital(latestFinance.net_assets)}
                </InfoCard>
              )}
              {latestFinance?.capital_stock_summary != null && (
                <InfoCard label="資本金">
                  {formatCapital(latestFinance.capital_stock_summary)}
                </InfoCard>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              データなし
            </p>
          )}
          {(majorShareholdersText || wd?.parentCompany) && (
            <div className="mt-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-400 font-medium mb-1">
                {majorShareholdersText ? "大株主" : "親会社"}
              </p>
              <p className="text-sm text-slate-700">
                {majorShareholdersText || wd?.parentCompany}
              </p>
            </div>
          )}
        </SectionCard>

        {/* ===== 最新決算 ===== */}
        <SectionCard title="最新決算" badge="自動検索">
          <Suspense fallback={<div className="shimmer h-32 rounded-xl" />}>
            <FundingNewsSection companyName={c.name} />
          </Suspense>
        </SectionCard>

        {/* ===== 役員一覧 ===== */}
        <SectionCard
          title="役員一覧"
          badge={
            [c.representative_name, wd?.ceo, wd?.founder].filter(Boolean)
              .length > 0
              ? `${[c.representative_name, wd?.ceo, wd?.founder].filter(Boolean).length} 名`
              : ""
          }
        >
          {c.representative_name || wd?.ceo || wd?.founder ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">役職</th>
                    <th className="pb-3 pr-4 font-medium">氏名</th>
                    <th className="pb-3 font-medium">出典</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {c.representative_name && (
                    <tr className="hover:bg-purple-50/50">
                      <td className="py-3 pr-4 text-slate-700 font-medium text-xs">
                        代表者
                      </td>
                      <td className="py-3 pr-4 text-slate-800 font-medium">
                        {c.representative_name}
                      </td>
                      <td className="py-3 text-xs">
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                          gBizINFO
                        </span>
                      </td>
                    </tr>
                  )}
                  {wd?.ceo && wd.ceo !== c.representative_name && (
                    <tr className="hover:bg-purple-50/50">
                      <td className="py-3 pr-4 text-slate-700 font-medium text-xs">
                        CEO
                      </td>
                      <td className="py-3 pr-4 text-slate-800 font-medium">
                        {wd.ceo}
                      </td>
                      <td className="py-3 text-xs">
                        <SourceLink url={wd.sourceUrl} name="Wikidata" />
                      </td>
                    </tr>
                  )}
                  {wd?.founder &&
                    wd.founder !== c.representative_name &&
                    wd.founder !== wd?.ceo && (
                      <tr className="hover:bg-purple-50/50">
                        <td className="py-3 pr-4 text-slate-700 font-medium text-xs">
                          創業者
                        </td>
                        <td className="py-3 pr-4 text-slate-800 font-medium">
                          {wd.founder}
                        </td>
                        <td className="py-3 text-xs">
                          <SourceLink url={wd.sourceUrl} name="Wikidata" />
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          ) : (
            <Suspense
              fallback={
                <p className="text-sm text-slate-400 text-center py-4">
                  検索中...
                </p>
              }
            >
              <OfficerFallback companyName={c.name} />
            </Suspense>
          )}
        </SectionCard>

        {/* ===== 株主構成 ===== */}
        <SectionCard
          title="株主構成"
          badge={majorShareholdersText || wd?.parentCompany ? "判明分" : ""}
        >
          {majorShareholdersText || wd?.parentCompany ? (
            <div className="space-y-3">
              {majorShareholdersText && (
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-1">
                    大株主
                  </p>
                  <p className="text-sm text-slate-700">
                    {majorShareholdersText}
                  </p>
                </div>
              )}
              {wd?.parentCompany && (
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-1">
                    親会社
                  </p>
                  <p className="text-sm text-slate-700 flex items-center gap-1.5">
                    {wd.parentCompany}
                    <SourceLink url={wd.sourceUrl} name="Wikidata" />
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Suspense
              fallback={
                <p className="text-sm text-slate-400 text-center py-4">
                  検索中...
                </p>
              }
            >
              <ShareholderFallback companyName={c.name} />
            </Suspense>
          )}
        </SectionCard>

        {/* ===== Workplace Info ===== */}
        {workplaceBase && (
          <SectionCard title="職場情報" badge="gBizINFO">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {workplaceBase.average_age != null && (
                <InfoCard label="平均年齢">
                  {workplaceBase.average_age}歳
                </InfoCard>
              )}
              {workplaceBase.average_continuous_service_years != null && (
                <InfoCard label="平均勤続年数">
                  {workplaceBase.average_continuous_service_years}年
                </InfoCard>
              )}
              {workplaceBase.month_average_predetermined_overtime_hours !=
                null && (
                <InfoCard label="月平均残業時間">
                  {workplaceBase.month_average_predetermined_overtime_hours}
                  時間
                </InfoCard>
              )}
              {workplaceBase.rate_of_paid_leave_taken != null && (
                <InfoCard label="有給取得率">
                  {(workplaceBase.rate_of_paid_leave_taken * 100).toFixed(1)}%
                </InfoCard>
              )}
              {workplaceBase.annual_days_of_paid_leave_taken != null && (
                <InfoCard label="有給取得日数">
                  {workplaceBase.annual_days_of_paid_leave_taken}日
                </InfoCard>
              )}
              {workplaceBase.rate_of_return_from_childcare_leave != null && (
                <InfoCard label="育休復帰率">
                  {(
                    workplaceBase.rate_of_return_from_childcare_leave * 100
                  ).toFixed(1)}
                  %
                </InfoCard>
              )}
              {workplaceBase.average_continuous_service_years_Female !=
                null && (
                <InfoCard label="女性 平均勤続年数">
                  {workplaceBase.average_continuous_service_years_Female}年
                </InfoCard>
              )}
              {workplaceBase.average_continuous_service_years_Male != null && (
                <InfoCard label="男性 平均勤続年数">
                  {workplaceBase.average_continuous_service_years_Male}年
                </InfoCard>
              )}
            </div>
          </SectionCard>
        )}

        {/* ===== Subsidies ===== */}
        <SectionCard title="補助金・助成金" badge={`${subsidies.length} 件`}>
          {subsidies.length === 0 ? (
            <Suspense
              fallback={
                <p className="text-sm text-slate-400 text-center py-4">
                  検索中...
                </p>
              }
            >
              <SubsidyFallback companyName={c.name} />
            </Suspense>
          ) : (
            <div className="space-y-3">
              {(
                subsidies as Array<{
                  title?: string;
                  government_departments?: string;
                  amount?: number;
                  date_of_approval?: string;
                  note?: string;
                }>
              ).map((s, i) => (
                <div
                  key={i}
                  className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <p className="font-medium text-slate-800">{s.title || "-"}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                    {s.government_departments && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        省庁: {s.government_departments}
                      </span>
                    )}
                    {s.amount != null && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        金額: {s.amount.toLocaleString()}円
                      </span>
                    )}
                    {s.date_of_approval && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        決定日: {s.date_of_approval}
                      </span>
                    )}
                  </div>
                  {s.note && (
                    <p className="text-xs text-slate-400 mt-1.5">{s.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ===== Patents ===== */}
        <SectionCard
          title="特許情報"
          badge={
            gbizPatents.length > 0
              ? `${gbizPatents.length} 件`
              : externalPatents.length > 0
                ? `${externalPatents.length} 件 (外部取得)`
                : "0 件"
          }
        >
          {gbizPatents.length > 0 ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">タイトル</th>
                    <th className="pb-3 pr-4 font-medium">種別</th>
                    <th className="pb-3 pr-4 font-medium">出願番号</th>
                    <th className="pb-3 font-medium">出願日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(
                    gbizPatents as Array<{
                      title?: string;
                      patent_type?: string;
                      application_number?: string;
                      application_date?: string;
                    }>
                  ).map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="py-2.5 pr-4 text-slate-700">
                        {p.title || "-"}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {p.patent_type || "-"}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">
                        {p.application_number || "-"}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {p.application_date || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : externalPatents.length > 0 ? (
            <div className="space-y-2">
              {externalPatents.map((p, i) => (
                <a
                  key={i}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
                >
                  <p className="text-sm text-slate-800 font-medium line-clamp-2">
                    {p.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                      {p.source}
                    </span>
                    {p.date && (
                      <span className="text-[10px] text-slate-400">
                        {p.date}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              データなし
            </p>
          )}
        </SectionCard>

        {/* ===== Certifications ===== */}
        <SectionCard
          title="届出・認定情報"
          badge={`${certifications.length} 件`}
        >
          {certifications.length === 0 ? (
            <Suspense
              fallback={
                <p className="text-sm text-slate-400 text-center py-4">
                  検索中...
                </p>
              }
            >
              <CertFallback companyName={c.name} />
            </Suspense>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(certifications as Array<Record<string, string>>).map(
                (cert, i) => (
                  <div
                    key={i}
                    className="border border-slate-100 rounded-xl p-4 text-sm hover:bg-slate-50/50 transition-colors"
                  >
                    {Object.entries(cert)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <p key={k} className="text-slate-600">
                          <span className="text-slate-400 text-xs">{k}: </span>
                          {String(v)}
                        </p>
                      ))}
                  </div>
                ),
              )}
            </div>
          )}
        </SectionCard>

        {/* ===== Commendations ===== */}
        {commendations.length > 0 && (
          <SectionCard title="表彰・受賞" badge={`${commendations.length} 件`}>
            <div className="space-y-3">
              {commendations.map((cm, i) => (
                <div
                  key={i}
                  className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <p className="font-medium text-slate-800">
                    {cm.title || "-"}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                    {cm.government_departments && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        省庁: {cm.government_departments}
                      </span>
                    )}
                    {cm.date_of_commendation && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        表彰日: {cm.date_of_commendation}
                      </span>
                    )}
                    {cm.category && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        {cm.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ===== 財務指標（計算値） ===== */}
        {latestFinance &&
          (latestFinance.net_sales || latestFinance.total_assets) && (
            <SectionCard
              title="財務指標"
              badge={latestFinance.fiscal_year_cover_page || "gBizINFO"}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {latestFinance.net_sales != null &&
                  latestFinance.ordinary_income != null &&
                  latestFinance.net_sales !== 0 && (
                    <InfoCard label="経常利益率">
                      {(
                        (latestFinance.ordinary_income /
                          latestFinance.net_sales) *
                        100
                      ).toFixed(1)}
                      %
                    </InfoCard>
                  )}
                {latestFinance.net_sales != null &&
                  latestFinance.net_income != null &&
                  latestFinance.net_sales !== 0 && (
                    <InfoCard label="純利益率">
                      {(
                        (latestFinance.net_income / latestFinance.net_sales) *
                        100
                      ).toFixed(1)}
                      %
                    </InfoCard>
                  )}
                {latestFinance.total_assets != null &&
                  latestFinance.net_assets != null &&
                  latestFinance.net_assets !== 0 && (
                    <InfoCard label="D/Eレシオ">
                      {(
                        (latestFinance.total_assets -
                          latestFinance.net_assets) /
                        latestFinance.net_assets
                      ).toFixed(2)}
                      倍
                    </InfoCard>
                  )}
                {latestFinance.total_assets != null &&
                  latestFinance.net_assets != null && (
                    <InfoCard label="負債合計">
                      {formatCapital(
                        latestFinance.total_assets -
                          (latestFinance.net_assets ?? 0),
                      )}
                    </InfoCard>
                  )}
              </div>
            </SectionCard>
          )}

        {/* ===== SNSリンク ===== */}
        <SectionCard title="SNS・外部プロフィール" badge="自動生成">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {[
              {
                name: "LinkedIn",
                url: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(c.name)}`,
              },
              {
                name: "X (Twitter)",
                url: `https://x.com/search?q=${encodeURIComponent(c.name)}&f=user`,
              },
              {
                name: "Facebook",
                url: `https://www.facebook.com/search/pages/?q=${encodeURIComponent(c.name)}`,
              },
              {
                name: "OpenWork",
                url: `https://www.vorkers.com/company_list?field=&pref=&src_str=${encodeURIComponent(c.name)}`,
              },
              {
                name: "転職会議",
                url: `https://jobtalk.jp/companies/search?q=${encodeURIComponent(c.name)}`,
              },
              {
                name: "GitHub",
                url: `https://github.com/search?q=${encodeURIComponent(c.name)}&type=users`,
              },
              {
                name: "note",
                url: `https://note.com/search?q=${encodeURIComponent(c.name)}&context=note`,
              },
              {
                name: "YouTube",
                url: `https://www.youtube.com/results?search_query=${encodeURIComponent(c.name)}`,
              },
            ].map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:bg-purple-50 hover:border-purple-200 transition-all text-sm group"
              >
                <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-purple-400 transition-colors shrink-0" />
                <span className="text-slate-700 group-hover:text-purple-700 font-medium truncate transition-colors">
                  {link.name}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-400 shrink-0 ml-auto transition-colors"
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
        <SectionCard title="競合企業・業界" badge="自動検索">
          <Suspense fallback={<div className="shimmer h-32 rounded-xl" />}>
            <CompetitorStartupSection
              companyName={c.name}
              industry={wd?.industry}
            />
          </Suspense>
        </SectionCard>

        {/* ===== 評判・口コミ ===== */}
        <SectionCard title="評判・口コミ" badge="自動検索">
          <Suspense fallback={<div className="shimmer h-32 rounded-xl" />}>
            <ReputationStartupSection companyName={c.name} />
          </Suspense>
        </SectionCard>

        {/* ===== Enriched: press, Wikipedia, reference links ===== */}
        <Suspense fallback={<EnrichedSkeleton />}>
          <EnrichedSections
            name={c.name}
            corporateNumber={c.corporate_number}
            location={c.location}
            companyUrl={c.company_url}
            hasDescription={!!description}
          />
        </Suspense>
      </div>
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      <div className="space-y-4">
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
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
          検索に戻る
        </Link>
        <div className="bg-red-50 border border-red-200/60 rounded-2xl p-6 text-red-700 text-sm space-y-1">
          <p>企業情報の取得に失敗しました。法人番号: {corporate_number}</p>
          <p className="text-xs text-red-400">{msg}</p>
        </div>
      </div>
    );
  }
}
