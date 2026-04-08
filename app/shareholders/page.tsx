import {
  searchShareholders,
  formatSharePct,
  getEdinetUrl,
} from "@/lib/edinetdb";
import ShareholderSearchForm, {
  type ShareholderSort,
} from "@/components/ShareholderSearchForm";
import { Suspense } from "react";
import Link from "next/link";

interface Props {
  searchParams: Promise<{
    q?: string;
    issuer?: string;
    ratio_min?: string;
    ratio_max?: string;
    date_from?: string;
    date_to?: string;
    sort?: string;
    page?: string;
  }>;
}

// 検索未指定時に並列取得する代表的な保有者キーワード
const DEFAULT_QUERIES = [
  "投資",
  "ホールディングス",
  "アセット",
  "ファンド",
  "キャピタル",
  "マネジメント",
];

const PAGE_SIZE = 20;

interface Filters {
  q: string;
  issuer: string;
  ratioMin?: number;
  ratioMax?: number;
  dateFrom?: string;
  dateTo?: string;
  sort: ShareholderSort;
}

function getSortComparator(sort: ShareholderSort) {
  switch (sort) {
    case "date_asc":
      return (
        a: { submit_date_time?: string },
        b: { submit_date_time?: string },
      ) => (a.submit_date_time || "").localeCompare(b.submit_date_time || "");
    case "ratio_desc":
      return (
        a: { total_holding_ratio?: number },
        b: { total_holding_ratio?: number },
      ) => (b.total_holding_ratio ?? -1) - (a.total_holding_ratio ?? -1);
    case "ratio_asc":
      return (
        a: { total_holding_ratio?: number },
        b: { total_holding_ratio?: number },
      ) =>
        (a.total_holding_ratio ?? Number.POSITIVE_INFINITY) -
        (b.total_holding_ratio ?? Number.POSITIVE_INFINITY);
    case "date_desc":
    default:
      return (
        a: { submit_date_time?: string },
        b: { submit_date_time?: string },
      ) => (b.submit_date_time || "").localeCompare(a.submit_date_time || "");
  }
}

async function Results({ filters, page }: { filters: Filters; page: number }) {
  const { q } = filters;
  const isDefault = !q;

  let allReports: Awaited<ReturnType<typeof searchShareholders>>;
  if (isDefault) {
    // 複数キーワードで並列検索 → 重複排除
    const settled = await Promise.allSettled(
      DEFAULT_QUERIES.map((t) => searchShareholders(t, 100)),
    );
    const seen = new Set<string>();
    const merged: Awaited<ReturnType<typeof searchShareholders>> = [];
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const rep of r.value) {
        const key = `${rep.doc_id}-${rep.filer_edinet_code}-${rep.issuer_edinet_code}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(rep);
      }
    }
    allReports = merged;
  } else {
    allReports = await searchShareholders(q, 500);
  }

  // クライアント側フィルタリング（API が対応していない項目）
  const issuerLower = filters.issuer.toLowerCase();
  const filtered = allReports.filter((r) => {
    if (
      issuerLower &&
      !(r.issuer_name || "").toLowerCase().includes(issuerLower)
    )
      return false;
    if (
      filters.ratioMin !== undefined &&
      (r.total_holding_ratio ?? 0) < filters.ratioMin / 100
    )
      return false;
    if (
      filters.ratioMax !== undefined &&
      (r.total_holding_ratio ?? 0) > filters.ratioMax / 100
    )
      return false;
    const submitDate = (r.submit_date_time || "").slice(0, 10);
    if (filters.dateFrom && submitDate && submitDate < filters.dateFrom)
      return false;
    if (filters.dateTo && submitDate && submitDate > filters.dateTo)
      return false;
    return true;
  });

  filtered.sort(getSortComparator(filters.sort));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const reports = filtered.slice(start, start + PAGE_SIZE);

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="text-3xl mb-2">---</div>
        該当なし
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-sm text-slate-600 truncate">
              {isDefault ? (
                <>
                  新着の大量保有報告（
                  {DEFAULT_QUERIES.map((t) => `「${t}」`).join(
                    "・",
                  )}をマージ）:{" "}
                  <span className="font-semibold text-slate-800">{total}</span>{" "}
                  件
                </>
              ) : (
                <>
                  「{q}」の大量保有報告:{" "}
                  <span className="font-semibold text-slate-800">{total}</span>{" "}
                  件
                </>
              )}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
            {currentPage} / {totalPages} ページ
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">発行会社</th>
                <th className="px-5 py-3 font-medium">保有者</th>
                <th className="px-5 py-3 text-right font-medium">保有割合</th>
                <th className="px-5 py-3 font-medium">目的</th>
                <th className="px-5 py-3 font-medium">報告日</th>
                <th className="px-5 py-3 font-medium">書類</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reports.map((r, i) => (
                <tr key={i} className="hover:bg-blue-50/50">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/company/${r.issuer_edinet_code}`}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {r.issuer_name}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {r.issuer_sec_code}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">
                    {r.holder_name}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-800">
                    {formatSharePct(r.total_holding_ratio)}
                  </td>
                  <td
                    className="px-5 py-3.5 text-xs text-slate-500 max-w-xs truncate"
                    title={r.purpose || ""}
                  >
                    {r.purpose || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                    {r.filing_trigger_date}
                  </td>
                  <td className="px-5 py-3.5">
                    <a
                      href={getEdinetUrl(r.doc_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                    >
                      EDINET
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        filters={filters}
        page={currentPage}
        totalPages={totalPages}
      />
    </div>
  );
}

function Pagination({
  filters,
  page,
  totalPages,
}: {
  filters: Filters;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const buildHref = (p: number) => {
    const qs = new URLSearchParams();
    if (filters.q) qs.set("q", filters.q);
    if (filters.issuer) qs.set("issuer", filters.issuer);
    if (filters.ratioMin !== undefined)
      qs.set("ratio_min", String(filters.ratioMin));
    if (filters.ratioMax !== undefined)
      qs.set("ratio_max", String(filters.ratioMax));
    if (filters.dateFrom) qs.set("date_from", filters.dateFrom);
    if (filters.dateTo) qs.set("date_to", filters.dateTo);
    if (filters.sort !== "date_desc") qs.set("sort", filters.sort);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/shareholders?${s}` : "/shareholders";
  };

  const pages: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++)
    pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-1">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          ← 前
        </Link>
      )}
      {pages[0] > 1 && (
        <>
          <Link
            href={buildHref(1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            1
          </Link>
          {pages[0] > 2 && <span className="text-slate-300 px-1">…</span>}
        </>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
            p === page
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {p}
        </Link>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="text-slate-300 px-1">…</span>
          )}
          <Link
            href={buildHref(totalPages)}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}
      {page < totalPages && (
        <Link
          href={buildHref(page + 1)}
          className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          次 →
        </Link>
      )}
    </div>
  );
}

const VALID_SORTS: ShareholderSort[] = [
  "date_desc",
  "date_asc",
  "ratio_desc",
  "ratio_asc",
];

function parseNumber(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

export default async function ShareholderSearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const sortParam = params.sort as ShareholderSort | undefined;
  const filters: Filters = {
    q: params.q || "",
    issuer: params.issuer || "",
    ratioMin: parseNumber(params.ratio_min),
    ratioMax: parseNumber(params.ratio_max),
    dateFrom: params.date_from || undefined,
    dateTo: params.date_to || undefined,
    sort:
      sortParam && VALID_SORTS.includes(sortParam) ? sortParam : "date_desc",
  };
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const suspenseKey = [
    filters.q,
    filters.issuer,
    filters.ratioMin ?? "",
    filters.ratioMax ?? "",
    filters.dateFrom ?? "",
    filters.dateTo ?? "",
    filters.sort,
    page,
  ].join("|");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">株主名検索</h2>
        <p className="text-sm text-slate-500 mt-1">
          投資ファンド・事業会社などの保有銘柄を横断検索（大量保有報告書ベース）
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <Suspense>
          <ShareholderSearchForm
            defaultQ={filters.q}
            defaultIssuer={filters.issuer}
            defaultRatioMin={
              filters.ratioMin !== undefined ? String(filters.ratioMin) : ""
            }
            defaultRatioMax={
              filters.ratioMax !== undefined ? String(filters.ratioMax) : ""
            }
            defaultDateFrom={filters.dateFrom || ""}
            defaultDateTo={filters.dateTo || ""}
            defaultSort={filters.sort}
          />
        </Suspense>
      </div>

      <Suspense
        key={suspenseKey}
        fallback={
          <div className="space-y-3">
            <div className="shimmer h-10 rounded-xl" />
            <div className="shimmer h-64 rounded-2xl" />
          </div>
        }
      >
        <Results filters={filters} page={page} />
      </Suspense>
    </div>
  );
}
