import { Suspense } from "react";
import { searchCompanies, listCompanies, creditColor } from "@/lib/edinetdb";
import SearchForm, { INDUSTRY_CATEGORIES } from "@/components/SearchForm";
import Link from "next/link";

interface Props {
  searchParams: Promise<{
    q?: string;
    industry?: string;
    rating?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 30;

const CATEGORY_ICONS: Record<string, string> = {
  製造業: "🏭",
  "金融・保険": "🏦",
  "情報・通信": "💻",
  "運輸・物流": "🚚",
  "商業・流通": "🛒",
  "インフラ・資源": "⚡",
  "建設・不動産": "🏗️",
  サービス: "🎯",
};

// Industry categories landing page
function IndustryLanding() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          業種カテゴリから探す
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(INDUSTRY_CATEGORIES).map(([cat, industries]) => (
          <div
            key={cat}
            className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{CATEGORY_ICONS[cat] || "📁"}</span>
              <h3 className="font-semibold text-slate-800">{cat}</h3>
            </div>
            <div className="space-y-1">
              {industries.map((ind) => (
                <Link
                  key={ind}
                  href={`/search?industry=${encodeURIComponent(ind)}`}
                  className="block text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-2 py-1 transition-colors"
                >
                  {ind}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function Results({
  q,
  industry,
  rating,
  page,
}: {
  q?: string;
  industry?: string;
  rating?: string;
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

  // No search/filter → show industry categories
  if (!q && !industry && !rating) {
    return <IndustryLanding />;
  }

  if (q) {
    let companies = await searchCompanies(q);

    // If exact search returns nothing, try fuzzy variants
    if (companies.length === 0) {
      const variants = generateFuzzyVariants(q);
      for (const variant of variants) {
        companies = await searchCompanies(variant);
        if (companies.length > 0) break;
      }
    }

    // Client-side rating filter
    if (rating) {
      companies = companies.filter((c) => c.credit_rating === rating);
    }

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
  let companies = result.data;
  const total = result.meta?.pagination?.total || 0;
  const totalPages = result.meta?.pagination?.total_pages || 1;

  // Client-side rating filter
  if (rating) {
    companies = companies.filter((c) => c.credit_rating === rating);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {industry && (
            <span className="inline-block px-2 py-0.5 bg-blue-50 rounded-full text-blue-600 text-xs font-medium mr-1">
              {industry}
            </span>
          )}
          {rating && (
            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full text-slate-600 text-xs font-medium mr-1">
              格付け: {rating}
            </span>
          )}
          全{" "}
          <span className="font-semibold text-slate-700">
            {total.toLocaleString()}
          </span>{" "}
          社<span className="text-slate-300 mx-1">|</span>
          {page}/{totalPages} ページ
        </span>
      </div>
      <CompanyGrid companies={companies} />
      <Pagination
        page={page}
        totalPages={totalPages}
        industry={industry}
        rating={rating}
      />
    </div>
  );
}

// Fuzzy search: generate katakana/hiragana/partial variants
function generateFuzzyVariants(q: string): string[] {
  const variants: string[] = [];

  // Katakana to Hiragana
  const hiragana = q.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
  if (hiragana !== q) variants.push(hiragana);

  // Hiragana to Katakana
  const katakana = q.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60),
  );
  if (katakana !== q) variants.push(katakana);

  // Try with 株式会社 prefix/suffix
  if (!q.includes("株式会社")) {
    variants.push(`株式会社${q}`);
    variants.push(`${q}株式会社`);
  }

  // Remove 株式会社
  if (q.includes("株式会社")) {
    variants.push(q.replace(/株式会社/g, "").trim());
  }

  // Partial: first 2-3 chars (for short names like エフコード)
  if (q.length >= 3) {
    variants.push(q.slice(0, Math.ceil(q.length * 0.7)));
  }

  return variants;
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
  rating,
}: {
  page: number;
  totalPages: number;
  industry?: string;
  rating?: string;
}) {
  const params = new URLSearchParams();
  if (industry) params.set("industry", industry);
  if (rating) params.set("rating", rating);
  const base = `/search?${params}`;
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
          <SearchForm
            defaultQ={params.q}
            defaultIndustry={params.industry}
            defaultRating={params.rating}
          />
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
        <Results
          q={params.q}
          industry={params.industry}
          rating={params.rating}
          page={page}
        />
      </Suspense>
    </div>
  );
}
