"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Props {
  /**
   * 現在の `?ai=1` フラグ状態。server 側で確定した値を渡す。
   * true のとき: ボタン非表示 (実行済み表示に置換)
   */
  enabled: boolean;
}

export default function AiRunButton({ enabled }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ai", "1");
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  if (enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
        AI実行済み
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold shadow-sm hover:shadow-md hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      title="AI分析・要約・グループ会社抽出・M&A戦略推察 を一括実行"
    >
      {pending ? (
        <svg
          className="animate-spin w-3.5 h-3.5"
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
      ) : (
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
      )}
      {pending ? "実行中..." : "AI実行"}
    </button>
  );
}
