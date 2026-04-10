import { Suspense } from "react";
import Link from "next/link";
import { searchUnified, type ListedFilter } from "@/lib/unified-company";
import type { UnifiedCompany } from "@/lib/unified-company";
import { creditColor, formatYen, formatYenM } from "@/lib/edinetdb";
import { formatCapital } from "@/lib/gbiz";
import { fetchMarketCap } from "@/lib/market";

// 売上 (百万円) を「N億円 / N兆円 / N百万円」表記に
const formatRevenueMillion = (m: number | null | undefined): string =>
  formatYenM(m);
import UnifiedSearchForm from "@/components/UnifiedSearchForm";
import AddToSellerButton from "@/components/AddToSellerButton";

interface Props {
  searchParams: Promise<{
    q?: string;
    listed?: string;
    industry?: string;
    year?: string;
    year_to?: string;
    capital_from?: string;
    capital_to?: string;
    employees_from?: string;
    employees_to?: string;
    prefecture?: string;
    business?: string;
    subsidy?: string;
    patent?: string;
    commendation?: string;
    finance?: string;
    exist?: string;
    /** 売上下限 (億円) — UI 表記はわかりやすいので億単位、内部で百万円に変換 */
    revenue_oku_from?: string;
    revenue_oku_to?: string;
    /** 内部留保 (純資産) 下限 (億円) */
    equity_oku_from?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 30;
const CURRENT_YEAR = new Date().getFullYear();

function parseListed(value: string | undefined): ListedFilter {
  if (value === "listed" || value === "unlisted") return value;
  return "all";
}

function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

// ---- Result list ----

async function UnifiedResults({
  q,
  listed,
  industry,
  year,
  yearTo,
  capitalFrom,
  capitalTo,
  employeesFrom,
  employeesTo,
  prefecture,
  business,
  subsidy,
  patent,
  commendation,
  finance,
  exist,
  revenueOkuFrom,
  revenueOkuTo,
  equityOkuFrom,
  page,
}: {
  q?: string;
  listed: ListedFilter;
  industry?: string;
  year?: number;
  yearTo?: number;
  capitalFrom?: number;
  capitalTo?: number;
  employeesFrom?: number;
  employeesTo?: number;
  prefecture?: string;
  business?: string;
  subsidy?: boolean;
  patent?: boolean;
  commendation?: boolean;
  finance?: boolean;
  exist?: boolean;
  /** 売上下限 (億円) */
  revenueOkuFrom?: number;
  /** 売上上限 (億円) */
  revenueOkuTo?: number;
  /** 内部留保下限 (億円) */
  equityOkuFrom?: number;
  page: number;
}) {
  // 億円 → 百万円 (×100)
  const okuToMillion = (oku: number | undefined): number | undefined =>
    oku != null ? oku * 100 : undefined;

  const result = await searchUnified({
    q,
    listed,
    industry,
    page,
    perSourceLimit: PAGE_SIZE,
    revenueMillionGte: okuToMillion(revenueOkuFrom),
    revenueMillionLte: okuToMillion(revenueOkuTo),
    equityMillionGte: okuToMillion(equityOkuFrom),
    gbiz: {
      founded_year_from: year,
      founded_year_to: yearTo,
      capital_stock_from: capitalFrom,
      capital_stock_to: capitalTo,
      employee_number_from: employeesFrom,
      employee_number_to: employeesTo,
      prefecture,
      business_item: business,
      subsidy,
      patent,
      commendation,
      finance,
      exist_flg: exist,
    },
  });

  if (result.companies.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        条件に該当する企業が見つかりませんでした
      </div>
    );
  }

  // 上場企業の時価総額を並列フェッチ (kabutan キャッシュ付き)
  const listedCompanies = result.companies.filter(
    (c) => c.isListed && c.secCode,
  );
  const marketCaps = new Map<string, number | null>();
  if (listedCompanies.length > 0) {
    const caps = await Promise.all(
      listedCompanies.map((c) => fetchMarketCap(c.secCode)),
    );
    listedCompanies.forEach((c, i) => {
      marketCaps.set(c.id, caps[i]);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
        <span>
          ヒット:{" "}
          <span className="font-semibold text-slate-700">
            {result.meta.mergedTotal.toLocaleString()}
          </span>{" "}
          件
        </span>
        <span className="text-slate-300">|</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          上場 {result.meta.listedCount.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          非上場 {result.meta.unlistedCount.toLocaleString()}
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-400">
          EDINET {result.meta.edinetTotal} / gBizINFO {result.meta.gbizTotal}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {result.companies.map((c) => (
          <UnifiedCard
            key={c.id}
            company={c}
            marketCap={marketCaps.get(c.id) ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function UnifiedCard({
  company: c,
  marketCap,
}: {
  company: UnifiedCompany;
  marketCap: number | null;
}) {
  const accentColor = c.isListed ? "blue" : "purple";
  const detailHref = `/company/${c.id}`;

  return (
    <div className="card-hover group bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={detailHref} className="min-w-0 flex-1">
          <p
            className={`font-semibold text-slate-800 truncate transition-colors ${
              c.isListed
                ? "group-hover:text-blue-600"
                : "group-hover:text-purple-600"
            }`}
          >
            {c.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                c.isListed
                  ? "bg-blue-50 text-blue-700"
                  : "bg-purple-50 text-purple-700"
              }`}
            >
              {c.isListed ? "上場" : "非上場"}
            </span>
            {c.source === "both" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                EDINET+gBiz
              </span>
            )}
            <span className="text-xs text-slate-400 font-mono truncate">
              {c.edinetCode ?? c.corporateNumber}
            </span>
          </div>
          {c.industry && (
            <p className="text-xs text-slate-500 mt-1.5">
              <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full">
                {c.industry}
              </span>
            </p>
          )}
        </Link>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {c.creditRating && (
            <>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm ${creditColor(c.creditRating)}`}
              >
                {c.creditRating}
              </span>
              {c.creditScore != null && (
                <span className="text-xs text-slate-400 font-mono">
                  {c.creditScore}pt
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {(c.capitalStock != null ||
        c.employeeNumber != null ||
        c.location ||
        c.revenueMillion != null ||
        marketCap != null) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs text-slate-500">
          {marketCap != null && (
            <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              時価総額 {formatYen(marketCap)}
            </span>
          )}
          {c.revenueMillion != null && c.revenueMillion > 0 && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
              <span className={`w-1 h-1 rounded-full bg-${accentColor}-300`} />
              売上 {formatRevenueMillion(c.revenueMillion)}
              {c.fiscalYear && (
                <span className="text-[10px] text-slate-400">
                  ({c.fiscalYear})
                </span>
              )}
            </span>
          )}
          {c.capitalStock != null && (
            <span className="inline-flex items-center gap-1">
              <span className={`w-1 h-1 rounded-full bg-${accentColor}-300`} />
              資本金 {formatCapital(c.capitalStock)}
            </span>
          )}
          {c.employeeNumber != null && (
            <span className="inline-flex items-center gap-1">
              <span className={`w-1 h-1 rounded-full bg-${accentColor}-300`} />
              {c.employeeNumber}人
            </span>
          )}
          {c.location && (
            <span className="inline-flex items-center gap-1 truncate">
              <span className={`w-1 h-1 rounded-full bg-${accentColor}-300`} />
              {c.location}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <AddToSellerButton
          companyName={c.name}
          companyCode={c.edinetCode ?? c.corporateNumber}
          industry={c.industry}
        />
      </div>
    </div>
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
  const listed = parseListed(params.listed);
  const q = params.q;
  const industry = params.industry;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const year = parseIntOrUndefined(params.year);
  const yearTo = parseIntOrUndefined(params.year_to);
  const capitalFrom = parseIntOrUndefined(params.capital_from);
  const capitalTo = parseIntOrUndefined(params.capital_to);
  const employeesFrom = parseIntOrUndefined(params.employees_from);
  const employeesTo = parseIntOrUndefined(params.employees_to);
  const prefecture = params.prefecture;
  const business = params.business;
  const subsidy = params.subsidy === "1" ? true : undefined;
  const patent = params.patent === "1" ? true : undefined;
  const commendation = params.commendation === "1" ? true : undefined;
  const finance = params.finance === "1" ? true : undefined;
  const exist = params.exist === "1" ? true : undefined;
  const revenueOkuFrom = parseIntOrUndefined(params.revenue_oku_from);
  const revenueOkuTo = parseIntOrUndefined(params.revenue_oku_to);
  const equityOkuFrom = parseIntOrUndefined(params.equity_oku_from);

  // UnifiedSearchForm は submit 時に必ず page=1 を付けるので、page パラメータの
  // 有無で「ユーザーが検索ボタンを押したか」を判別する。これにより空欄で
  // 検索された場合も EDINET の全件リスト (listEdinet) フローに進める。
  const formSubmitted = params.page !== undefined;

  const hasAnyInput =
    formSubmitted ||
    Boolean(q) ||
    Boolean(industry) ||
    year != null ||
    yearTo != null ||
    capitalFrom != null ||
    capitalTo != null ||
    employeesFrom != null ||
    employeesTo != null ||
    Boolean(prefecture) ||
    Boolean(business) ||
    Boolean(subsidy) ||
    Boolean(patent) ||
    Boolean(commendation) ||
    Boolean(finance) ||
    Boolean(exist) ||
    revenueOkuFrom != null ||
    revenueOkuTo != null ||
    equityOkuFrom != null ||
    listed === "listed";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">企業検索</h2>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <Suspense>
          <UnifiedSearchForm
            defaultQ={q}
            defaultListed={listed}
            defaultIndustry={industry}
            defaultYear={params.year}
            defaultYearTo={params.year_to}
            defaultCapitalFrom={params.capital_from}
            defaultCapitalTo={params.capital_to}
            defaultEmployeesFrom={params.employees_from}
            defaultEmployeesTo={params.employees_to}
            defaultPrefecture={prefecture}
            defaultBusiness={business}
            defaultSubsidy={subsidy}
            defaultPatent={patent}
            defaultCommendation={commendation}
            defaultFinance={finance}
            defaultExist={exist}
            defaultRevenueOkuFrom={params.revenue_oku_from}
            defaultRevenueOkuTo={params.revenue_oku_to}
            defaultEquityOkuFrom={params.equity_oku_from}
            currentYear={CURRENT_YEAR}
          />
        </Suspense>
      </div>

      {hasAnyInput ? (
        <Suspense fallback={<ResultSkeleton />}>
          <UnifiedResults
            q={q}
            listed={listed}
            industry={industry}
            year={year}
            yearTo={yearTo}
            capitalFrom={capitalFrom}
            capitalTo={capitalTo}
            employeesFrom={employeesFrom}
            employeesTo={employeesTo}
            prefecture={prefecture}
            business={business}
            subsidy={subsidy}
            patent={patent}
            commendation={commendation}
            finance={finance}
            exist={exist}
            revenueOkuFrom={revenueOkuFrom}
            revenueOkuTo={revenueOkuTo}
            equityOkuFrom={equityOkuFrom}
            page={page}
          />
        </Suspense>
      ) : (
        <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          企業名を入力するか、フィルターで絞り込んでください
        </div>
      )}
    </div>
  );
}
