import { Suspense } from "react";
import { searchCompanies, listCompanies, creditColor } from "@/lib/edinetdb";
import SearchForm from "@/components/SearchForm";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string; industry?: string; page?: string }>;
}

const PAGE_SIZE = 30;

async function Results({ q, industry, page }: { q?: string; industry?: string; page: number }) {
  const apiKey = process.env.EDINET_API_KEY;
  if (!apiKey) {
    return (
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-6 text-amber-800 space-y-3">
        <h3 className="font-bold">⚠️ EDINET DB API キーが設定されていません</h3>
        <p className="text-sm">
          プロジェクトの <code className="bg-amber-100 px-1 rounded">.env.local</code> に
          <code className="bg-amber-100 px-1 rounded ml-1">EDINET_API_KEY=your_key</code> を追加してください。
        </p>
      </div>
    );
  }

  if (q) {
    const companies = await searchCompanies(q);
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">「{q}」の検索結果: {companies.length} 件</p>
        <CompanyGrid companies={companies} />
      </div>
    );
  }

  const result = await listCompanies({ industry, limit: PAGE_SIZE, page });
  const total = result.meta?.pagination?.total || 0;
  const totalPages = result.meta?.pagination?.total_pages || 1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">全 {total.toLocaleString()} 社 — {page}/{totalPages} ページ</p>
      <CompanyGrid companies={result.data} />
      <Pagination page={page} totalPages={totalPages} industry={industry} />
    </div>
  );
}

function CompanyGrid({ companies }: { companies: ReturnType<typeof searchCompanies> extends Promise<infer T> ? T : never }) {
  if (!companies.length) {
    return <div className="text-center py-16 text-gray-400 bg-white rounded-lg border border-gray-200">該当企業なし</div>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {companies.map((c) => (
        <Link
          key={c.edinet_code}
          href={`/company/${c.edinet_code}`}
          className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-sm transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{c.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.edinet_code} {c.sec_code ? `/ ${c.sec_code}` : ""}</p>
              <p className="text-xs text-gray-500 mt-1">{c.industry}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${creditColor(c.credit_rating)}`}>
                {c.credit_rating}
              </span>
              <span className="text-xs text-gray-400">{c.credit_score}点</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, industry }: { page: number; totalPages: number; industry?: string }) {
  const base = industry ? `/?industry=${encodeURIComponent(industry)}` : "/";
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-2">
      {page > 1 && (
        <Link href={`${base}&page=${page - 1}`} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">← 前</Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={`${base}&page=${p}`}
          className={`px-3 py-1.5 border rounded text-sm ${p === page ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={`${base}&page=${page + 1}`} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">次 →</Link>
      )}
    </div>
  );
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <Suspense>
          <SearchForm defaultQ={params.q} defaultIndustry={params.industry} />
        </Suspense>
      </div>

      {/* Results */}
      <Suspense
        fallback={
          <div className="text-center py-16 text-gray-400 bg-white rounded-lg border border-gray-200">
            データを取得中...
          </div>
        }
      >
        <Results q={params.q} industry={params.industry} page={page} />
      </Suspense>
    </div>
  );
}
