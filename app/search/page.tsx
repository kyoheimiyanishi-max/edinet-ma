import { Suspense } from "react";
import {
  searchCompanies as searchEdinet,
  listCompanies,
  creditColor,
} from "@/lib/edinetdb";
import {
  searchCompanies as searchGBiz,
  kindLabel,
  formatCapital,
  formatEstablished,
  yearsOld,
} from "@/lib/gbiz";
import { expandQuery } from "@/lib/ai-search";
import UnifiedSearchForm from "@/components/UnifiedSearchForm";
import type { SourceType } from "@/components/UnifiedSearchForm";
import Link from "next/link";

interface Props {
  searchParams: Promise<{
    q?: string;
    source?: string;
    industry?: string;
    year?: string;
    capital_to?: string;
    employees_to?: string;
    prefecture?: string;
    subsidy?: string;
    patent?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 30;
const CURRENT_YEAR = new Date().getFullYear();

// ---- EDINET Results ----

async function EdinetResults({
  q,
  industry,
  page,
}: {
  q?: string;
  industry?: string;
  page: number;
}) {
  const apiKey = process.env.EDINET_API_KEY;
  if (!apiKey) return null;

  if (q) {
    // AI拡張: 元のクエリ + AI生成の関連キーワードで並列検索
    const terms = await expandQuery(q);
    const settled = await Promise.allSettled(terms.map((t) => searchEdinet(t)));
    const seen = new Set<string>();
    const companies = settled
      .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
      .filter((c) => {
        if (seen.has(c.edinet_code)) return false;
        seen.add(c.edinet_code);
        return true;
      });

    if (companies.length === 0) return null;
    return (
      <div className="space-y-4">
        <SectionLabel
          label="上場企業 (EDINET)"
          count={companies.length}
          color="blue"
          sub={terms.length > 1 ? `AI拡張: ${terms.join(", ")}` : undefined}
        />
        <EdinetGrid companies={companies} />
      </div>
    );
  }

  const result = await listCompanies({ industry, limit: PAGE_SIZE, page });
  const total = result.meta?.pagination?.total || 0;
  const totalPages = result.meta?.pagination?.total_pages || 1;

  if (result.data.length === 0) return null;

  return (
    <div className="space-y-4">
      <SectionLabel
        label="上場企業 (EDINET)"
        count={total}
        color="blue"
        sub={`${page}/${totalPages} ページ`}
      />
      <EdinetGrid companies={result.data} />
      <Pagination page={page} totalPages={totalPages} industry={industry} />
    </div>
  );
}

function EdinetGrid({
  companies,
}: {
  companies: Awaited<ReturnType<typeof searchEdinet>>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {companies.map((c) => (
        <Link
          key={c.edinet_code}
          href={`/company/${c.edinet_code}`}
          className="card-hover group bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                {c.name}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {c.edinet_code} {c.sec_code ? `/ ${c.sec_code}` : ""}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full">
                  {c.industry}
                </span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm ${creditColor(c.credit_rating)}`}
              >
                {c.credit_rating}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {c.credit_score}pt
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ---- gBizINFO Results ----

async function GBizResults({
  q,
  year,
  capitalTo,
  employeesTo,
  prefecture,
  subsidy,
  patent,
  page,
}: {
  q?: string;
  year?: number;
  capitalTo?: number;
  employeesTo?: number;
  prefecture?: string;
  subsidy?: boolean;
  patent?: boolean;
  page: number;
}) {
  // gBizINFO requires at least one filter parameter
  const hasFilter =
    q || year || capitalTo || employeesTo || prefecture || subsidy || patent;
  if (!hasFilter) return null;

  // AI拡張: 複数キーワードで並列検索
  const terms = q ? await expandQuery(q) : [undefined];

  let allCompanies: Awaited<ReturnType<typeof searchGBiz>>["hojin-infos"] = [];
  try {
    const settled = await Promise.allSettled(
      terms.map((t) =>
        searchGBiz({
          name: t || undefined,
          founded_year: year,
          capital_stock_to: capitalTo,
          employee_number_to: employeesTo,
          prefecture,
          subsidy,
          patent,
          page,
          limit: 50,
        }),
      ),
    );
    const seen = new Set<string>();
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const c of r.value["hojin-infos"] || []) {
        if (seen.has(c.corporate_number)) continue;
        seen.add(c.corporate_number);
        allCompanies.push(c);
      }
    }
  } catch {
    return null;
  }

  const data = { "hojin-infos": allCompanies };

  const companies = data["hojin-infos"] || [];
  if (companies.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionLabel
          label="法人 (gBizINFO)"
          count={companies.length}
          color="purple"
          sub={[
            companies.length === 50
              ? `${page} ページ目（次のページあり）`
              : `${page} ページ目`,
            terms.length > 1
              ? `AI拡張: ${terms.filter(Boolean).join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" | ")}
        />
        <div className="flex gap-2 text-sm">
          {page > 1 && (
            <GBizPageLink
              page={page - 1}
              params={{
                q,
                year,
                capitalTo,
                employeesTo,
                prefecture,
                subsidy,
                patent,
              }}
            >
              ← 前へ
            </GBizPageLink>
          )}
          {companies.length === 50 && (
            <GBizPageLink
              page={page + 1}
              params={{
                q,
                year,
                capitalTo,
                employeesTo,
                prefecture,
                subsidy,
                patent,
              }}
            >
              次へ →
            </GBizPageLink>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map((c) => {
          const age = yearsOld(c.date_of_establishment);
          return (
            <Link
              key={c.corporate_number}
              href={`/startups/${c.corporate_number}`}
              className="card-hover group bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate group-hover:text-purple-600 transition-colors">
                    {c.name}
                  </p>
                  {c.kana && <p className="text-xs text-slate-400">{c.kana}</p>}
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {c.location}
                  </p>
                  {c.business_summary && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {c.business_summary}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs shrink-0 space-y-1.5">
                  {age !== null && (
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full font-bold shadow-sm ${
                        age <= 3
                          ? "bg-purple-100 text-purple-700"
                          : age <= 7
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {age <= 3 ? "創業期" : age <= 7 ? "成長期" : ""}
                      {age}年
                    </span>
                  )}
                  <p className="text-slate-400">{kindLabel(c.kind)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  設立: {formatEstablished(c.date_of_establishment)}
                </span>
                {c.capital_stock != null && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    資本金: {formatCapital(c.capital_stock)}
                  </span>
                )}
                {c.employee_number != null && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    従業員: {c.employee_number}人
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ---- Shared UI ----

function SectionLabel({
  label,
  count,
  color,
  sub,
}: {
  label: string;
  count: number;
  color: "blue" | "purple";
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-1.5 h-1.5 rounded-full ${color === "blue" ? "bg-blue-500" : "bg-purple-500"}`}
      />
      <span className="text-sm text-slate-500">
        {label}:{" "}
        <span className="font-semibold text-slate-700">
          {typeof count === "number" ? count.toLocaleString() : count}
        </span>{" "}
        件{sub && <span className="text-slate-300 mx-1">|</span>}
        {sub && <span>{sub}</span>}
      </span>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  industry,
}: {
  page: number;
  totalPages: number;
  industry?: string;
}) {
  const buildHref = (p: number) => {
    const qs = new URLSearchParams();
    qs.set("source", "edinet");
    if (industry) qs.set("industry", industry);
    qs.set("page", String(p));
    return `/search?${qs}`;
  };
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++)
    pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      {page > 1 && (
        <Link
          href={buildHref(page - 1)}
          className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          ← 前
        </Link>
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

function GBizPageLink({
  page,
  params,
  children,
}: {
  page: number;
  params: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const qs = new URLSearchParams();
  qs.set("source", "gbiz");
  qs.set("page", String(page));
  if (params.q) qs.set("q", String(params.q));
  if (params.year) qs.set("year", String(params.year));
  if (params.capitalTo) qs.set("capital_to", String(params.capitalTo));
  if (params.employeesTo) qs.set("employees_to", String(params.employeesTo));
  if (params.prefecture) qs.set("prefecture", String(params.prefecture));
  if (params.subsidy) qs.set("subsidy", "1");
  if (params.patent) qs.set("patent", "1");
  return (
    <Link
      href={`/search?${qs}`}
      className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
    >
      {children}
    </Link>
  );
}

function ResultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-6 w-40 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ---- Page ----

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const source = (params.source || "all") as SourceType;
  const q = params.q;
  const industry = params.industry;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const year = params.year ? parseInt(params.year, 10) : undefined;
  const capitalTo = params.capital_to
    ? parseInt(params.capital_to, 10)
    : undefined;
  const employeesTo = params.employees_to
    ? parseInt(params.employees_to, 10)
    : undefined;
  const prefecture = params.prefecture;
  const subsidy = params.subsidy === "1" ? true : undefined;
  const patent = params.patent === "1" ? true : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">企業検索</h2>
        <p className="text-sm text-slate-500 mt-1">
          EDINET上場企業 + gBizINFO 500万社を横断検索
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <Suspense>
          <UnifiedSearchForm
            defaultQ={q}
            defaultSource={source}
            defaultIndustry={industry}
            defaultYear={params.year}
            defaultCapitalTo={params.capital_to}
            defaultEmployeesTo={params.employees_to}
            defaultPrefecture={prefecture}
            defaultSubsidy={subsidy}
            defaultPatent={patent}
            currentYear={CURRENT_YEAR}
          />
        </Suspense>
      </div>

      {/* EDINET Results */}
      {(source === "all" || source === "edinet") && (
        <Suspense fallback={<ResultSkeleton />}>
          <EdinetResults q={q} industry={industry} page={page} />
        </Suspense>
      )}

      {/* gBizINFO Results */}
      {(source === "all" || source === "gbiz") && (
        <Suspense fallback={<ResultSkeleton />}>
          <GBizResults
            q={q}
            year={year}
            capitalTo={capitalTo}
            employeesTo={employeesTo}
            prefecture={prefecture}
            subsidy={subsidy}
            patent={patent}
            page={page}
          />
        </Suspense>
      )}

      {/* Empty state when no source selected */}
      {!q && source === "all" && !industry && (
        <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          企業名を入力するか、フィルターで絞り込んでください
        </div>
      )}
    </div>
  );
}
