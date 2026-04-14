"use client";

import ReactMarkdown from "react-markdown";
import {
  type AnalysisState,
  useCompanyAnalysis,
} from "./CompanyAnalysisContext";

export type { MaStrategyCompanyData } from "./CompanyAnalysisContext";

export default function CompanyAnalysis() {
  const { analysis, ma } = useCompanyAnalysis();

  const data = analysis.status === "success" ? analysis.data : null;

  return (
    <div className="space-y-6">
      {/* ===== 事業モデル・戦略（事業モデル / 銘柄特徴 / 事業戦略を統合） ===== */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-slate-700">事業モデル・戦略</h3>
          </div>
        </div>
        {data && extractBusinessTldr(data.businessModel) && (
          <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100/60">
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold mt-0.5">
                ✨ 要約
              </span>
              <p className="text-sm text-slate-700 leading-relaxed">
                {extractBusinessTldr(data.businessModel)}
              </p>
            </div>
          </div>
        )}
        <div className="p-6">
          {analysis.status === "idle" ? (
            <p className="text-sm text-slate-400 text-center py-4">
              未実行 — 「AI実行」を押すと表示されます
            </p>
          ) : analysis.status === "loading" ? (
            <div className="shimmer h-24 rounded-xl" />
          ) : analysis.status === "error" ? (
            <p className="text-sm text-amber-700">{analysis.message}</p>
          ) : (
            data && (
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
            )
          )}
        </div>
      </section>

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
 * Markdown 本文から「一言サマリ」を抜き出す。
 * - `### 要約` セクション配下の本文を最優先で採用
 * - 見つからない場合は、見出し/水平線/装飾記号のみの行をスキップしつつ
 *   最初の意味のある段落を返すフォールバック
 */
function extractTldr(text: string): string | null {
  if (!text) return null;

  const fromSection = extractSummarySection(text);
  if (fromSection) return clamp(fromSection);

  const fromFirstPara = extractFirstParagraph(text);
  if (fromFirstPara) return clamp(fromFirstPara);

  return null;
}

/**
 * 事業モデル本文から「一言要約」を抜き出す。
 * 最初の句点 (。) までを採用し、長すぎる場合は clamp する。
 */
function extractBusinessTldr(text: string | undefined | null): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const firstSentence = trimmed.split(/(?<=。)/)[0]?.trim() ?? trimmed;
  return clamp(stripMd(firstSentence));
}

function extractSummarySection(text: string): string | null {
  const lines = text.split("\n");
  let inSummary = false;
  const collected: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const headingMatch = line.match(/^#+\s*(.+?)\s*$/);
    if (headingMatch) {
      if (inSummary) break;
      if (/^(要約|サマリー?|tl;dr|TLDR)/i.test(headingMatch[1])) {
        inSummary = true;
      }
      continue;
    }
    if (!inSummary) continue;
    if (!line) {
      if (collected.length > 0) break;
      continue;
    }
    if (/^[-*_]{3,}\s*$/.test(line)) continue;
    collected.push(line.replace(/^[-*•]\s+/, ""));
  }
  if (collected.length === 0) return null;
  return stripMd(collected.join(" "));
}

function extractFirstParagraph(text: string): string | null {
  const lines = text.split("\n");
  const para: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (para.length > 0) break;
      continue;
    }
    if (/^#+\s/.test(line)) continue;
    if (/^[-*_]{3,}\s*$/.test(line)) continue;
    if (/^```/.test(line)) continue;
    if (/^>\s*/.test(line)) continue;
    if (/^\*+[^*]+\*+\s*$/.test(line)) continue;
    para.push(line.replace(/^[-*•]\s+/, ""));
    if (para.length >= 1) break;
  }
  if (para.length === 0) return null;
  return stripMd(para.join(" "));
}

function stripMd(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function clamp(s: string, max = 200): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
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
