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
  name, year, capitalTo, employeesTo, prefecture, subsidy, patent, page,
}: {
  name?: string; year?: number; capitalTo?: number; employeesTo?: number;
  prefecture?: string; subsidy?: boolean; patent?: boolean; page: number;
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
      <div className="text-center py-16 text-gray-400 bg-white rounded-lg border border-gray-200">
        該当企業なし。条件を変更してください。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {page} ページ目・{companies.length} 件表示
          {companies.length === 50 && (
            <span className="ml-1 text-gray-400">（次のページあり）</span>
          )}
        </p>
        <div className="flex gap-2 text-sm">
          {page > 1 && (
            <PageLink page={page - 1} params={{ name, year, capitalTo, employeesTo, prefecture, subsidy, patent }}>
              ← 前へ
            </PageLink>
          )}
          {companies.length === 50 && (
            <PageLink page={page + 1} params={{ name, year, capitalTo, employeesTo, prefecture, subsidy, patent }}>
              次へ →
            </PageLink>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {companies.map((c) => {
          const age = yearsOld(c.date_of_establishment);
          return (
            <Link
              key={c.corporate_number}
              href={`/startups/${c.corporate_number}`}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-purple-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-800 truncate">{c.name}</p>
                  {c.kana && (
                    <p className="text-xs text-gray-400">{c.kana}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 truncate">{c.location}</p>
                  {c.business_summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.business_summary}</p>
                  )}
                </div>
                <div className="text-right text-xs shrink-0 space-y-1">
                  {age !== null && (
                    <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${
                      age <= 3 ? "bg-purple-100 text-purple-700" :
                      age <= 7 ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {age <= 3 ? "創業期" : age <= 7 ? "成長期" : ""}
                      {age}年
                    </span>
                  )}
                  <p className="text-gray-400">{kindLabel(c.kind)}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                <span>設立: {formatEstablished(c.date_of_establishment)}</span>
                {c.capital_stock != null && (
                  <span>資本金: {formatCapital(c.capital_stock)}</span>
                )}
                {c.employee_number != null && (
                  <span>従業員: {c.employee_number}人</span>
                )}
                {c.representative_name && (
                  <span>代表: {c.representative_name}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-center gap-3 pt-2">
        {page > 1 && (
          <PageLink page={page - 1} params={{ name, year, capitalTo, employeesTo, prefecture, subsidy, patent }}
            className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
            ← 前へ
          </PageLink>
        )}
        {companies.length === 50 && (
          <PageLink page={page + 1} params={{ name, year, capitalTo, employeesTo, prefecture, subsidy, patent }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
            次へ →
          </PageLink>
        )}
      </div>
    </div>
  );
}

function PageLink({
  page, params, children, className,
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
    <Link href={`/startups?${qs}`} className={className ?? "text-sm text-blue-600 hover:underline"}>
      {children}
    </Link>
  );
}

export default async function StartupsPage({ searchParams }: Props) {
  const params = await searchParams;
  const name = params.name;
  const year = params.year ? parseInt(params.year, 10) : CURRENT_YEAR - 5;
  const capitalTo = params.capital_to ? parseInt(params.capital_to, 10) : undefined;
  const employeesTo = params.employees_to ? parseInt(params.employees_to, 10) : undefined;
  const prefecture = params.prefecture;
  const subsidy = params.subsidy === "1" ? true : undefined;
  const patent = params.patent === "1" ? true : undefined;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">スタートアップ検索</h2>
        <p className="text-sm text-gray-500 mt-1">
          経済産業省 gBizINFO — 500万社以上の法人データから非上場スタートアップを検索
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
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

      <Suspense
        fallback={
          <div className="text-center py-16 text-gray-400 bg-white rounded-lg border border-gray-200">
            gBizINFO からデータを取得中...
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
    </div>
  );
}
