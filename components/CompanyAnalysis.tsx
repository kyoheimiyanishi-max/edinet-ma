"use client";

import ReactMarkdown from "react-markdown";
import {
  type AnalysisState,
  type MaState,
  useCompanyAnalysis,
} from "./CompanyAnalysisContext";

export type { MaStrategyCompanyData } from "./CompanyAnalysisContext";

export default function CompanyAnalysis() {
  const { analysis, ma, runAll } = useCompanyAnalysis();

  const noneStarted = analysis.status === "idle" && ma.status === "idle";
  const bothDone =
    (analysis.status === "success" || analysis.status === "error") &&
    (ma.status === "success" || ma.status === "error");
  const data = analysis.status === "success" ? analysis.data : null;

  return (
    <div className="space-y-6">
      {/* ===== ヘッダー (実行コントロール + ステータス) ===== */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-700">
              AI分析・M&A戦略推察
            </h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              Claude AI
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusPill label="AI分析" state={analysis.status} />
            <StatusPill label="M&A戦略" state={ma.status} />
            {(noneStarted || bothDone) && (
              <button
                type="button"
                onClick={runAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold shadow-sm hover:shadow-md hover:from-indigo-600 hover:to-purple-600 transition-all"
              >
                <SparkIcon />
                {bothDone ? "再実行" : "AI実行"}
              </button>
            )}
          </div>
        </div>
        {noneStarted && (
          <div className="px-6 py-3 bg-indigo-50/40 border-t border-indigo-100/60">
            <p className="text-[11px] text-slate-500 text-center">
              「AI実行」で会社概要・事業モデル・役員・M&A実績・戦略推察を一括生成します（生成には十数秒〜1分ほどかかる場合があります）
            </p>
          </div>
        )}
      </section>

      {/* ===== 事業モデル・戦略（事業モデル / 銘柄特徴 / 事業戦略を統合） ===== */}
      <AnalysisCard title="事業モデル・戦略" state={analysis}>
        {data && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                事業モデル
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                {data.businessModel}
              </p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                銘柄特徴
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                {data.stockCharacteristics}
              </p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                事業戦略の推察
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                {data.corporateStrategy}
              </p>
            </div>
          </div>
        )}
      </AnalysisCard>

      {/* ===== M&A 買収一覧 ===== */}
      <AnalysisCard
        title="M&A 買収一覧"
        badge={data ? `${data.maAcquisitions.length} 件` : undefined}
        badgeColor="blue"
        state={analysis}
      >
        {data &&
          (data.maAcquisitions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              M&A実績情報なし
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">時期</th>
                    <th className="pb-3 pr-4 font-medium">買収先</th>
                    <th className="pb-3 pr-4 font-medium text-right">金額</th>
                    <th className="pb-3 font-medium">目的・背景</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.maAcquisitions.map((acq, i) => (
                    <tr key={i} className="hover:bg-blue-50/50">
                      <td className="py-3 pr-4 text-slate-500 whitespace-nowrap font-mono text-xs">
                        {acq.date}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-800">
                        {acq.target}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-slate-700 whitespace-nowrap">
                        {acq.amount}
                      </td>
                      <td className="py-3 text-xs text-slate-500 max-w-xs">
                        {acq.purpose}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </AnalysisCard>

      {/* ===== 次に買収しそうな企業像 ===== */}
      <AnalysisCard
        title="次に買収しそうな企業像"
        badge="AI予測"
        badgeColor="amber"
        state={analysis}
      >
        {data &&
          (data.nextTargets.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              予測データなし
            </p>
          ) : (
            <div className="space-y-4">
              {data.nextTargets.map((target, i) => (
                <div
                  key={i}
                  className="bg-slate-50/80 rounded-xl p-4 border border-slate-100"
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="space-y-1.5">
                      <p className="font-semibold text-slate-800 text-sm">
                        {target.type}
                      </p>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium text-slate-600">
                          想定規模:
                        </span>{" "}
                        {target.scale}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {target.rationale}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </AnalysisCard>

      {/* ===== AI M&A 戦略推察 (ストリーミング) ===== */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-slate-700">AI M&A 戦略推察</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
              AI推察
            </span>
          </div>
          {ma.status === "loading" ? <Spinner /> : null}
        </div>
        {/* TL;DR: 本文の最初の段落をサマリとして上部に出す */}
        {(ma.status === "loading" || ma.status === "success") &&
          ma.text &&
          extractTldr(ma.text) && (
            <div className="px-6 py-3 bg-purple-50/50 border-b border-purple-100/60">
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold mt-0.5">
                  ✨ 要約
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {extractTldr(ma.text)}
                </p>
              </div>
            </div>
          )}
        <div className="p-6">
          {ma.status === "idle" ? (
            <p className="text-sm text-slate-400 text-center py-4">
              未実行 — 「AI実行」を押すと生成されます
            </p>
          ) : ma.status === "error" ? (
            <p className="text-sm text-amber-700">{ma.message}</p>
          ) : (
            <div className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2 prose-h4:text-sm prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-800">
              <ReactMarkdown>{ma.text}</ReactMarkdown>
            </div>
          )}
          {ma.status === "success" ? (
            <p className="text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100">
              ※ AIによる推察です。投資判断の根拠としないでください。
            </p>
          ) : null}
        </div>
      </section>

      <p className="text-xs text-slate-400 text-center">
        ※ AI分析は公開情報に基づく推察であり、投資判断の根拠としないでください
      </p>
    </div>
  );
}

/**
 * Markdown 本文から「最初の意味のある段落」を抜き出して TL;DR として返す。
 * - Markdown 見出し (#, ##, ###) はスキップ
 * - 空行までを 1 段落として扱う
 * - 200 文字を超える場合は切り詰める
 */
function extractTldr(text: string): string | null {
  if (!text) return null;
  const lines = text.split("\n");
  let para: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (para.length > 0) break;
      continue;
    }
    // 見出し行はスキップ (### 1. M&A戦略の推察 等)
    if (/^#+\s/.test(line)) continue;
    // bold/italic だけの行もスキップ
    if (/^\*+[^*]+\*+\s*$/.test(line)) continue;
    // bullet list の場合は最初の項目だけ取る
    para.push(line.replace(/^[-*•]\s*/, ""));
    if (para.length >= 2) break;
  }
  if (para.length === 0) return null;
  let summary = para.join(" ").replace(/\*\*/g, "").trim();
  if (summary.length > 200) summary = summary.slice(0, 200) + "…";
  return summary;
}

// ---- sub components ----

function AnalysisCard({
  title,
  badge,
  badgeColor = "slate",
  state,
  children,
}: {
  title: string;
  badge?: string;
  badgeColor?: "slate" | "emerald" | "purple" | "amber" | "blue";
  state: AnalysisState;
  children: React.ReactNode;
}) {
  const badgeClasses = {
    slate: "bg-slate-100 text-slate-500",
    emerald: "bg-emerald-100 text-emerald-700",
    purple: "bg-purple-100 text-purple-600",
    amber: "bg-amber-100 text-amber-600",
    blue: "bg-blue-100 text-blue-600",
  }[badgeColor];

  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <h3 className="font-semibold text-slate-700">{title}</h3>
          {badge && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClasses}`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
      <div className="p-6">
        {state.status === "idle" ? (
          <p className="text-sm text-slate-400 text-center py-4">
            未実行 — 「AI実行」を押すと表示されます
          </p>
        ) : state.status === "loading" ? (
          <div className="shimmer h-24 rounded-xl" />
        ) : state.status === "error" ? (
          <p className="text-sm text-amber-700">{state.message}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function StatusPill({
  label,
  state,
}: {
  label: string;
  state: AnalysisState["status"] | MaState["status"];
}) {
  const map: Record<typeof state, { text: string; className: string }> = {
    idle: { text: "未実行", className: "bg-slate-100 text-slate-400" },
    loading: { text: "実行中", className: "bg-blue-100 text-blue-600" },
    success: { text: "完了", className: "bg-emerald-100 text-emerald-600" },
    error: { text: "エラー", className: "bg-amber-100 text-amber-700" },
  };
  const cfg = map[state];
  return (
    <span
      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.className}`}
    >
      {label}: {cfg.text}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 text-indigo-500"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}
