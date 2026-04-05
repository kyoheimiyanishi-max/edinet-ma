import { Suspense } from "react";
import {
  searchCompanies,
  PREFECTURES,
  kindLabel,
  formatCapital,
  formatEstablished,
  yearsOld,
} from "@/lib/gbiz";
import GBizSearchForm from "@/components/GBizSearchForm";
import Link from "next/link";

interface Props {
  searchParams: Promise<{
    name?: string;
    year?: string;
    capital_to?: string;
    employees_to?: string;
    prefecture?: string;
    subsidy?: string;
    patent?: string;
    page?: string;
  }>;
}

const CURRENT_YEAR = new Date().getFullYear();

async function ResultList({
  name,
  year,
  capitalTo,
  employeesTo,
  prefecture,
  subsidy,
  patent,
  page,
}: {
  name?: string;
  year?: number;
  capitalTo?: number;
  employeesTo?: number;
  prefecture?: string;
  subsidy?: boolean;
  patent?: boolean;
  page: number;
}) {
  const data = await searchCompanies({
    name,
    founded_year: year,
    capital_stock_to: capitalTo,
    employee_number_to: employeesTo,
    prefecture,
    subsidy,
    patent,
    page,
    limit: 50,
  });

  const companies = data["hojin-infos"] || [];

  if (companies.length === 0) {
    return (
      <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="text-3xl mb-2">---</div>
        該当企業なし。条件を変更してください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          {page} ページ目・
          <span className="font-semibold text-slate-700">
            {companies.length}
          </span>{" "}
          件表示
          {companies.length === 50 && (
            <span className="text-slate-400 ml-1">（次のページあり）</span>
          )}
        </span>
        <div className="flex gap-2 text-sm">
          {page > 1 && (
            <PageLink
              page={page - 1}
              params={{
                name,
                year,
                capitalTo,
                employeesTo,
                prefecture,
                subsidy,
                patent,
              }}
            >
              ← 前へ
            </PageLink>
          )}
          {companies.length === 50 && (
            <PageLink
              page={page + 1}
              params={{
                name,
                year,
                capitalTo,
                employeesTo,
                prefecture,
                subsidy,
                patent,
              }}
            >
              次へ →
            </PageLink>
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
                {c.representative_name && (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    代表: {c.representative_name}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-center gap-3 pt-2">
        {page > 1 && (
          <PageLink
            page={page - 1}
            params={{
              name,
              year,
              capitalTo,
              employeesTo,
              prefecture,
              subsidy,
              patent,
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ← 前へ
          </PageLink>
        )}
        {companies.length === 50 && (
          <PageLink
            page={page + 1}
            params={{
              name,
              year,
              capitalTo,
              employeesTo,
              prefecture,
              subsidy,
              patent,
            }}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 shadow-md shadow-purple-500/25 transition-all"
          >
            次へ →
          </PageLink>
        )}
      </div>
    </div>
  );
}

function PageLink({
  page,
  params,
  children,
  className,
}: {
  page: number;
  params: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  if (params.name) qs.set("name", String(params.name));
  if (params.year) qs.set("year", String(params.year));
  if (params.capitalTo) qs.set("capital_to", String(params.capitalTo));
  if (params.employeesTo) qs.set("employees_to", String(params.employeesTo));
  if (params.prefecture) qs.set("prefecture", String(params.prefecture));
  if (params.subsidy) qs.set("subsidy", "1");
  if (params.patent) qs.set("patent", "1");
  return (
    <Link
      href={`/startups?${qs}`}
      className={
        className ??
        "text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
      }
    >
      {children}
    </Link>
  );
}

export default async function StartupsPage({ searchParams }: Props) {
  const params = await searchParams;
  const name = params.name;
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
  const page = Math.max(1, parseInt(params.page || "1", 10));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">スタートアップ検索</h2>
        <p className="text-sm text-slate-500 mt-1">
          経済産業省 gBizINFO —
          500万社以上の法人データから非上場スタートアップを検索
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <Suspense>
          <GBizSearchForm
            defaultName={name}
            defaultYear={String(year)}
            defaultCapitalTo={params.capital_to}
            defaultEmployeesTo={params.employees_to}
            defaultPrefecture={prefecture}
            defaultSubsidy={params.subsidy === "1"}
            defaultPatent={params.patent === "1"}
            prefectures={PREFECTURES}
            currentYear={CURRENT_YEAR}
          />
        </Suspense>
      </div>

      {name ? (
        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="shimmer h-6 w-48 rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="shimmer h-36 rounded-2xl" />
                ))}
              </div>
            </div>
          }
        >
          <ResultList
            name={name}
            year={year}
            capitalTo={capitalTo}
            employeesTo={employeesTo}
            prefecture={prefecture}
            subsidy={subsidy}
            patent={patent}
            page={page}
          />
        </Suspense>
      ) : (
        <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">🔍</div>
          企業名を入力して検索してください
        </div>
      )}
    </div>
  );
}
