"use client";

import { useState, useEffect, useCallback } from "react";

interface OfficerInfo {
  position: string;
  name: string;
  career: string;
}

interface MaAcquisition {
  date: string;
  target: string;
  amount: string;
  purpose: string;
}

interface NextTarget {
  type: string;
  scale: string;
  rationale: string;
}

interface AnalysisData {
  marketSegment: string;
  companyOverview: string;
  businessModel: string;
  stockCharacteristics: string;
  officers: OfficerInfo[];
  maAcquisitions: MaAcquisition[];
  corporateStrategy: string;
  maStrategy: string;
  nextTargets: NextTarget[];
}

export default function CompanyAnalysis({
  edinetCode,
  companyName,
}: {
  edinetCode: string;
  companyName: string;
}) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edinetCode }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `分析に失敗しました (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("ストリームが取得できません");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      // Parse JSON - strip markdown fences if present
      let jsonStr = fullText.trim();
      // Remove markdown code fences
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr) as AnalysisData;
      setData(parsed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "分析中にエラーが発生しました";
      if (msg.includes("ANTHROPIC_API_KEY") || msg.includes("API key")) {
        setError(
          "ANTHROPIC_API_KEY が設定されていません。.env.local に追加してください。",
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [edinetCode]);

  // Auto-run on mount
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  if (loading) {
    return (
      <div className="space-y-4">
        <section className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-600 font-medium">
              {companyName} のAI分析を実行中...
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="shimmer h-4 w-3/4 rounded" />
            <div className="shimmer h-4 w-1/2 rounded" />
            <div className="shimmer h-4 w-2/3 rounded" />
            <div className="shimmer h-20 rounded-xl mt-4" />
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <section className="bg-amber-50 border border-amber-200/60 rounded-2xl p-6">
        <h3 className="font-semibold text-amber-800 mb-1">AI分析</h3>
        <p className="text-sm text-amber-700">{error}</p>
        <button
          onClick={runAnalysis}
          className="mt-3 text-sm text-amber-600 underline hover:text-amber-800"
        >
          再試行
        </button>
      </section>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Company Overview */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-slate-700">会社概要</h3>
            {data.marketSegment && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                {data.marketSegment}
              </span>
            )}
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.companyOverview}
          </p>
        </div>
      </section>

      {/* Business Model & Stock Characteristics */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">
            事業モデル・銘柄特徴
          </h3>
        </div>
        <div className="p-6 space-y-4">
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
        </div>
      </section>

      {/* Officers */}
      {data.officers.length > 0 && (
        <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <h3 className="font-semibold text-slate-700">主要役員</h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {data.officers.length}名
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">役職</th>
                    <th className="pb-3 pr-4 font-medium">氏名</th>
                    <th className="pb-3 font-medium">経歴・略歴</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.officers.map((o, i) => (
                    <tr key={`ai-officer-${i}`} className="hover:bg-blue-50/50">
                      <td className="py-3 pr-4 text-slate-700 font-medium text-xs whitespace-nowrap">
                        {o.position}
                      </td>
                      <td className="py-3 pr-4 text-slate-800 font-medium whitespace-nowrap">
                        {o.name}
                      </td>
                      <td className="py-3 text-xs text-slate-500 leading-relaxed">
                        {o.career}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* M&A Acquisitions Table */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-slate-700">M&A 買収一覧</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
              {data.maAcquisitions.length} 件
            </span>
          </div>
        </div>
        <div className="p-6">
          {data.maAcquisitions.length === 0 ? (
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
          )}
        </div>
      </section>

      {/* Corporate Strategy */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-slate-700">事業戦略の推察</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
              AI推察
            </span>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.corporateStrategy}
          </p>
        </div>
      </section>

      {/* M&A Strategy */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-slate-700">M&A戦略の推察</h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">
              AI推察
            </span>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-700 leading-relaxed">
            {data.maStrategy}
          </p>
        </div>
      </section>

      {/* Next Acquisition Targets */}
      <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h3 className="font-semibold text-slate-700">
              次に買収しそうな企業像
            </h3>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
              AI予測
            </span>
          </div>
        </div>
        <div className="p-6">
          {data.nextTargets.length === 0 ? (
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
          )}
        </div>
      </section>

      <p className="text-xs text-slate-400 text-center">
        ※ AI分析は公開情報に基づく推察であり、投資判断の根拠としないでください
      </p>
    </div>
  );
}
