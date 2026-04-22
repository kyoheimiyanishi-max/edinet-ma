import { Suspense } from "react";
import Link from "next/link";

import {
  computeRanking,
  MA_EVENT_TYPE_LABEL,
  type RankingItem,
  type RankingMode,
  type RankingResult,
} from "@/lib/ma-ranking";
import type { MaEventType } from "@/lib/edinet-ma-parser";

interface Props {
  searchParams: Promise<{
    from?: string;
    to?: string;
    mode?: string;
    threshold?: string;
  }>;
}

const CURRENT_YEAR = new Date().getFullYear();
// EDINET API v2 は 2024-04-01 以降の臨時報告書 (docTypeCode=180) のみ
// 網羅的に返す。それより前はインデックス未整備で 0 件扱い。
const DEFAULT_FROM = "2024-04-01";
const DEFAULT_TO = "2025-12-31";

const EVENT_TYPE_COLORS: Record<MaEventType, string> = {
  stock_acquisition: "bg-blue-100 text-blue-700 border-blue-200",
  merger: "bg-violet-100 text-violet-700 border-violet-200",
  split: "bg-teal-100 text-teal-700 border-teal-200",
  business_transfer: "bg-amber-100 text-amber-700 border-amber-200",
  tob: "bg-rose-100 text-rose-700 border-rose-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

function normalizeParams(params: {
  from?: string;
  to?: string;
  mode?: string;
  threshold?: string;
}): { from: string; to: string; mode: RankingMode; threshold: number } {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "")
    ? (params.from as string)
    : DEFAULT_FROM;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "")
    ? (params.to as string)
    : DEFAULT_TO;
  const mode: RankingMode =
    params.mode === "period-min" ? "period-min" : "annual-min";
  const defaultThreshold = mode === "annual-min" ? 2 : 1;
  const parsed = Number(params.threshold);
  const threshold =
    Number.isInteger(parsed) && parsed >= 1 ? parsed : defaultThreshold;
  return { from, to, mode, threshold };
}

export default async function MaRankingPage({ searchParams }: Props) {
  const raw = await searchParams;
  const params = normalizeParams(raw);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">M&A 企業ランキング</h2>
        <p className="text-sm text-slate-500 mt-1">
          EDINET 臨時報告書 (株式取得 / 合併 / 会社分割 / 事業譲渡)
          とニュース起点の M&amp;A を統合し、期間内の関与企業をカウントします。
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 inline-block">
          ※ EDINET API v2 の都合で、臨時報告書は
          <span className="font-semibold mx-1">2024-04-01 以降</span>
          のみ取得可能です。
        </p>
      </div>

      <FiltersForm {...params} />

      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shimmer h-20 rounded-2xl" />
            ))}
          </div>
        }
        key={`${params.from}:${params.to}:${params.mode}:${params.threshold}`}
      >
        <ResultSection {...params} />
      </Suspense>
    </div>
  );
}

function FiltersForm({
  from,
  to,
  mode,
  threshold,
}: {
  from: string;
  to: string;
  mode: RankingMode;
  threshold: number;
}) {
  return (
    <form
      method="get"
      className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <TabLink
          active={mode === "annual-min"}
          href={buildUrl({ from, to, mode: "annual-min", threshold: 2 })}
        >
          年間 {mode === "annual-min" ? threshold : 2} 件以上
        </TabLink>
        <TabLink
          active={mode === "period-min"}
          href={buildUrl({ from, to, mode: "period-min", threshold: 1 })}
        >
          期間内 {mode === "period-min" ? threshold : 1} 件以上
        </TabLink>
      </div>

      <input type="hidden" name="mode" value={mode} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm text-slate-600">
          <span className="block mb-1 font-medium">開始日</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            max={`${CURRENT_YEAR}-12-31`}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </label>
        <label className="text-sm text-slate-600">
          <span className="block mb-1 font-medium">終了日</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            max={`${CURRENT_YEAR}-12-31`}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </label>
        <label className="text-sm text-slate-600">
          <span className="block mb-1 font-medium">
            閾値 ({mode === "annual-min" ? "年間件数" : "期間内件数"})
          </span>
          <input
            type="number"
            name="threshold"
            min={1}
            defaultValue={threshold}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 shadow-md shadow-purple-500/25 transition-all"
          >
            絞り込み
          </button>
          <a
            href={`/api/ma-ranking/csv?from=${from}&to=${to}&mode=${mode}&threshold=${threshold}`}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            CSV
          </a>
        </div>
      </div>
    </form>
  );
}

function TabLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white shadow-sm"
          : "px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
      }
    >
      {children}
    </Link>
  );
}

function buildUrl(params: {
  from: string;
  to: string;
  mode: RankingMode;
  threshold: number;
}): string {
  const qs = new URLSearchParams();
  qs.set("from", params.from);
  qs.set("to", params.to);
  qs.set("mode", params.mode);
  qs.set("threshold", String(params.threshold));
  return `/ma-ranking?${qs}`;
}

async function ResultSection({
  from,
  to,
  mode,
  threshold,
}: {
  from: string;
  to: string;
  mode: RankingMode;
  threshold: number;
}) {
  let result: RankingResult;
  try {
    result = await computeRanking({ from, to, mode, threshold });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">
        <p className="font-semibold mb-1">集計に失敗しました</p>
        <p className="text-xs text-red-600/80">{msg.slice(0, 200)}</p>
        <p className="mt-2 text-xs text-red-600/80">
          ma_filings テーブル未作成の可能性があります。
          <code className="bg-white/60 px-1 rounded">
            scripts/migrations/003_create_ma_filings.sql
          </code>{" "}
          を d6e 運営に適用依頼してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatsBanner result={result} />
      {result.items.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          条件に合致する企業はありません。
        </div>
      ) : (
        <div className="space-y-3">
          {result.items.map((item) => (
            <CompanyRow key={item.companyKey} item={item} mode={mode} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatsBanner({ result }: { result: RankingResult }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 bg-white rounded-2xl border border-slate-200/60 shadow-sm px-5 py-3">
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        <span className="font-semibold text-slate-700">
          {result.stats.totalCompanies}
        </span>
        <span>社該当</span>
      </span>
      <span className="text-slate-300">|</span>
      <span>
        総関与:{" "}
        <span className="font-medium text-slate-700">
          {result.stats.totalInvolvements}
        </span>
        件
      </span>
      <span className="text-slate-300">|</span>
      <span>
        EDINET{" "}
        <span className="font-medium text-slate-700">
          {result.stats.bySource.edinet}
        </span>{" "}
        / ニュース{" "}
        <span className="font-medium text-slate-700">
          {result.stats.bySource.news}
        </span>
      </span>
      <span className="text-slate-300">|</span>
      <span className="text-xs text-slate-400">
        {result.from} 〜 {result.to}
      </span>
    </div>
  );
}

function CompanyRow({ item, mode }: { item: RankingItem; mode: RankingMode }) {
  const years = Object.keys(item.yearlyCounts)
    .map(Number)
    .sort((a, b) => a - b);

  const companyLink = item.edinetCode ? `/company/${item.edinetCode}` : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm px-5 py-4 flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {companyLink ? (
            <Link
              href={companyLink}
              className="font-semibold text-slate-800 hover:text-purple-600 transition-colors"
            >
              {item.companyName}
            </Link>
          ) : (
            <span className="font-semibold text-slate-800">
              {item.companyName}
            </span>
          )}
          {item.secCode && (
            <span className="text-xs text-slate-400 font-mono">
              {item.secCode}
            </span>
          )}
          {!item.edinetCode && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              未上場/未取込
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {(Object.keys(item.byEventType) as MaEventType[])
            .filter((k) => item.byEventType[k] > 0)
            .map((k) => (
              <span
                key={k}
                className={`text-xs px-2 py-0.5 rounded-full border ${EVENT_TYPE_COLORS[k]}`}
              >
                {MA_EVENT_TYPE_LABEL[k]} {item.byEventType[k]}
              </span>
            ))}
        </div>
      </div>

      <div className="flex gap-3 md:gap-4 items-center shrink-0">
        <div className="flex gap-1.5">
          {years.map((y) => (
            <div
              key={y}
              className="text-center min-w-[48px] px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60"
            >
              <div className="text-[10px] text-slate-400 font-medium">{y}</div>
              <div className="text-base font-bold text-slate-700">
                {item.yearlyCounts[y]}
              </div>
            </div>
          ))}
        </div>
        <div className="text-right min-w-[72px]">
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
            {mode === "annual-min" ? "年間最大" : "期間合計"}
          </div>
          <div className="text-xl font-bold text-purple-600">
            {mode === "annual-min" ? item.peakYearlyCount : item.totalInPeriod}
          </div>
        </div>
      </div>
    </div>
  );
}
