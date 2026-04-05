import { Suspense } from "react";
import { searchCompanies, listCompanies, creditColor } from "@/lib/edinetdb";
import SearchForm from "@/components/SearchForm";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string; industry?: string; page?: string }>;
}

const PAGE_SIZE = 30;

async function Results({
  q,
  industry,
  page,
}: {
  q?: string;
  industry?: string;
  page: number;
}) {
  const apiKey = process.env.EDINET_API_KEY;
  if (!apiKey) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 space-y-3">
        <h3 className="font-bold">EDINET DB API キーが設定されていません</h3>
        <p className="text-sm">
          プロジェクトの{" "}
          <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">
            .env.local
          </code>{" "}
          に
          <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs ml-1">
            EDINET_API_KEY=your_key
          </code>{" "}
          を追加してください。
        </p>
      </div>
    );
  }

  if (q) {
    const companies = await searchCompanies(q);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />「{q}
            」の検索結果:{" "}
            <span className="font-semibold text-slate-700">
              {companies.length}
            </span>{" "}
            件
          </span>
        </div>
        <CompanyGrid companies={companies} />
      </div>
    );
  }

  const result = await listCompanies({ industry, limit: PAGE_SIZE, page });
  const total = result.meta?.pagination?.total || 0;
  const totalPages = result.meta?.pagination?.total_pages || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />全{" "}
          <span className="font-semibold text-slate-700">
            {total.toLocaleString()}
          </span>{" "}
          社<span className="text-slate-300 mx-1">|</span>
          {page}/{totalPages} ページ
        </span>
      </div>
      <CompanyGrid companies={result.data} />
      <Pagination page={page} totalPages={totalPages} industry={industry} />
    </div>
  );
}

function CompanyGrid({
  companies,
}: {
  companies: ReturnType<typeof searchCompanies> extends Promise<infer T>
    ? T
    : never;
}) {
  if (!companies.length) {
    return (
      <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="text-4xl mb-3">---</div>
        <p>該当企業なし</p>
      </div>
    );
  }
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

function Pagination({
  page,
  totalPages,
  industry,
}: {
  page: number;
  totalPages: number;
  industry?: string;
}) {
  const base = industry
    ? `/search?industry=${encodeURIComponent(industry)}`
    : "/search";
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++)
    pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      {page > 1 && (
        <Link
          href={`${base}&page=${page - 1}`}
          className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          ← 前
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={`${base}&page=${p}`}
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
          href={`${base}&page=${page + 1}`}
          className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          次 →
        </Link>
      )}
    </div>
  );
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  return (
    <div className="space-y-6">
      {/* Hero search */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <Suspense>
          <SearchForm defaultQ={params.q} defaultIndustry={params.industry} />
        </Suspense>
      </div>

      {/* Results */}
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="shimmer h-6 w-40 rounded-lg" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="shimmer h-28 rounded-2xl" />
              ))}
            </div>
          </div>
        }
      >
        <Results q={params.q} industry={params.industry} page={page} />
      </Suspense>
    </div>
  );
}
