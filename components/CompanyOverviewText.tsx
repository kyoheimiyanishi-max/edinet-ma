"use client";

import { useCompanyAnalysis } from "./CompanyAnalysisContext";

interface Props {
  /** AI 未実行 / 失敗時に表示するフォールバック (Wikidata 説明など) */
  fallback: string;
  /** フォールバックの出典名 (任意) */
  fallbackSourceName?: string;
  /** フォールバックの出典URL (任意) */
  fallbackSourceUrl?: string;
}

export default function CompanyOverviewText({
  fallback,
  fallbackSourceName,
  fallbackSourceUrl,
}: Props) {
  const { analysis } = useCompanyAnalysis();

  if (analysis.status === "success") {
    const { companyOverview, marketSegment } = analysis.data;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold"
            title="Claude AI による要約"
          >
            ✨ AI
          </span>
          {marketSegment && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {marketSegment}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {companyOverview}
        </p>
      </div>
    );
  }

  if (analysis.status === "loading") {
    return (
      <div className="space-y-2">
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-4 w-5/6 rounded" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-700 leading-relaxed">{fallback}</p>
      {fallbackSourceUrl && fallbackSourceName && (
        <a
          href={fallbackSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-500 transition-colors"
        >
          出典: {fallbackSourceName}
        </a>
      )}
    </div>
  );
}
