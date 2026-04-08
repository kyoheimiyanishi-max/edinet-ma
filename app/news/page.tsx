import {
  searchNews,
  formatPubDate,
  getNewsCategoryColor,
  filterNews,
  NEWS_CATEGORIES,
  NEWS_DATE_RANGES,
  uniqueNewsSources,
  type NewsItem,
  type NewsCategory,
  type NewsDateRange,
} from "@/lib/news";
import SimpleSearchForm from "@/components/SimpleSearchForm";
import { Suspense } from "react";

interface Props {
  searchParams: Promise<{
    q?: string;
    category?: string;
    range?: string;
    source?: string;
  }>;
}

function buildUrl(
  base: string,
  current: { q?: string; category?: string; range?: string; source?: string },
  override: Partial<{
    q?: string;
    category?: string;
    range?: string;
    source?: string;
  }>,
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...override };
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.range) params.set("range", merged.range);
  if (merged.source) params.set("source", merged.source);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function FilterChip({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-slate-800 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </a>
  );
}

async function NewsResults({
  q,
  category,
  range,
  source,
}: {
  q?: string;
  category?: NewsCategory;
  range?: NewsDateRange;
  source?: string;
}) {
  const all: NewsItem[] = await searchNews(q);
  const items = filterNews(all, { category, dateRange: range, source });
  const sources = uniqueNewsSources(all);

  const current = { q, category, range, source };

  return (
    <div className="space-y-4">
      {/* Source filter (only when sources exist) */}
      {sources.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500">メディア</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={!source}
              href={buildUrl("/news", current, { source: undefined })}
            >
              すべて
            </FilterChip>
            {sources.slice(0, 20).map((s) => (
              <FilterChip
                key={s}
                active={source === s}
                href={buildUrl("/news", current, { source: s })}
              >
                {s}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          {q ? `「${q}」の` : "M&A関連"}ニュース:{" "}
          <span className="font-semibold text-slate-700">{items.length}</span>{" "}
          件
          {(category || range || source) && (
            <span className="text-slate-400 ml-1">
              （絞り込み中・元 {all.length} 件）
            </span>
          )}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          <p>ニュースが見つかりませんでした</p>
          <p className="text-xs mt-2 text-slate-300">
            検索キーワードや絞り込みを変えてお試しください
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover block bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-800 leading-snug hover:text-blue-600 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {item.source && (
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                        {item.source}
                      </span>
                    )}
                    {item.category && (
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getNewsCategoryColor(item.category)}`}
                      >
                        {item.category}
                      </span>
                    )}
                    {item.pubDate && (
                      <span className="text-xs text-slate-400">
                        {formatPubDate(item.pubDate)}
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  className="w-4 h-4 text-slate-300 shrink-0 mt-1"
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
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function NewsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q || undefined;
  const category = (params.category as NewsCategory | undefined) || undefined;
  const range = (params.range as NewsDateRange | undefined) || undefined;
  const source = params.source || undefined;

  const current = { q, category, range, source };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">M&A ニュース</h2>
        <p className="text-sm text-slate-500 mt-1">
          8つのカテゴリから M&A・買収・合併・事業承継の最新ニュースを自動集約
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <Suspense>
          <SimpleSearchForm
            placeholder="キーワードで絞り込み（空欄で全カテゴリ自動集約）"
            action="/news"
            buttonColor="orange"
            defaultValue={q ?? ""}
          />
        </Suspense>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">カテゴリ</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={!category}
              href={buildUrl("/news", current, {
                category: undefined,
                source: undefined,
              })}
            >
              すべて
            </FilterChip>
            {NEWS_CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                active={category === c}
                href={buildUrl("/news", current, {
                  category: c,
                  source: undefined,
                })}
              >
                {c}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">期間</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={!range}
              href={buildUrl("/news", current, { range: undefined })}
            >
              全期間
            </FilterChip>
            {NEWS_DATE_RANGES.map((r) => (
              <FilterChip
                key={r.value}
                active={range === r.value}
                href={buildUrl("/news", current, { range: r.value })}
              >
                {r.label}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="shimmer h-6 w-56 rounded-lg" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="shimmer h-24 rounded-2xl" />
            ))}
          </div>
        }
      >
        <NewsResults q={q} category={category} range={range} source={source} />
      </Suspense>
    </div>
  );
}
