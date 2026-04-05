import {
  searchNews,
  formatPubDate,
  getNewsCategoryColor,
  type NewsItem,
} from "@/lib/news";
import SimpleSearchForm from "@/components/SimpleSearchForm";
import { Suspense } from "react";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

async function NewsResults({ q }: { q?: string }) {
  const items: NewsItem[] = await searchNews(q);

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="text-3xl mb-2">---</div>
        <p>ニュースが見つかりませんでした</p>
        <p className="text-xs mt-2 text-slate-300">
          検索キーワードを変えてお試しください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          {q ? `「${q}」の` : "M&A関連"}ニュース:{" "}
          <span className="font-semibold text-slate-700">{items.length}</span>{" "}
          件
        </span>
      </div>
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
    </div>
  );
}

export default async function NewsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q || undefined;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">M&A ニュース</h2>
        <p className="text-sm text-slate-500 mt-1">
          8つのカテゴリから M&A・買収・合併・事業承継の最新ニュースを自動集約
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <Suspense>
          <SimpleSearchForm
            placeholder="キーワードで絞り込み（空欄で全カテゴリ自動集約）"
            action="/news"
            buttonColor="orange"
            defaultValue={q ?? ""}
          />
        </Suspense>
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
        <NewsResults q={q} />
      </Suspense>
    </div>
  );
}
