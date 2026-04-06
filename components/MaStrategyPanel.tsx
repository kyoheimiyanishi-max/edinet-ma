"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface CompanyData {
  name: string;
  industry?: string;
  listingCategory?: string;
  creditRating?: string;
  creditScore?: number;
  marketCap?: number;
  revenue?: number;
  operatingIncome?: number;
  netIncome?: number;
  totalAssets?: number;
  equity?: number;
  cash?: number;
  equityRatio?: number;
  shareholders?: {
    name: string;
    ratio: number;
    delta: number;
    purpose: string;
  }[];
  description?: string;
}

export default function MaStrategyPanel({ company }: { company: CompanyData }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const analyze = useCallback(async () => {
    setLoading(true);
    setStarted(true);
    setText("");

    try {
      const res = await fetch("/api/ma-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
      });

      if (!res.ok || !res.body) {
        setText("分析に失敗しました。APIキーを確認してください。");
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        setText(buf);
      }
    } catch {
      setText("分析中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }, [company]);

  if (!started) {
    return (
      <button
        onClick={analyze}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-all font-medium text-sm"
      >
        <svg
          className="w-5 h-5"
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
        AIでM&A戦略を分析する
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
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
          AI分析中...
        </div>
      )}
      <div className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2 prose-h4:text-sm prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-strong:text-slate-800">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
      {!loading && text && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            ※ AIによる推察です。投資判断の根拠としないでください。
          </p>
          <button
            onClick={analyze}
            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
          >
            再分析
          </button>
        </div>
      )}
    </div>
  );
}
