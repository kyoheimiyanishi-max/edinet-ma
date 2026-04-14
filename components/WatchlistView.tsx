"use client";

import { useMemo, useState } from "react";
import WatchlistCard from "./WatchlistCard";
import type { Prefecture } from "@/lib/prefecture";

export interface WatchlistViewItem {
  entry: {
    id: string;
    companyId: string;
    name: string;
    industry?: string;
    secCode?: string;
    corporateNumber?: string;
    edinetCode?: string;
    note: string | null;
  };
  latestFiscalYear: number | null;
  isNew: boolean;
  marketSegment: string | null;
  prefecture: Prefecture | null;
  metrics: {
    label: string;
    latestText: string;
    changePct: number | null;
    series: { year: number; value: number | null }[];
  }[];
}

// 上場市場フィルタの表示ラベル ↔ `fetchMarketSegment` の返り値マッピング。
// 東証以外 (名証 / 札証 / 福証) は「その他」に集約。
const MARKET_OPTIONS = [
  { value: "東証プライム", label: "東証プライム" },
  { value: "東証スタンダード", label: "東証スタンダード" },
  { value: "東証グロース", label: "東証グロース" },
  { value: "その他", label: "その他 (名証/札証/福証)" },
  { value: "不明", label: "市場情報なし" },
] as const;

function classifyMarket(raw: string | null): string {
  if (!raw) return "不明";
  if (
    raw === "東証プライム" ||
    raw === "東証スタンダード" ||
    raw === "東証グロース"
  )
    return raw;
  return "その他";
}

export default function WatchlistView({
  items,
}: {
  items: WatchlistViewItem[];
}) {
  const [industry, setIndustry] = useState("");
  const [market, setMarket] = useState("");
  const [prefecture, setPrefecture] = useState("");

  // 実在する値だけをプルダウンに出す (選べないオプションを並べない)
  const industryOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) if (it.entry.industry) s.add(it.entry.industry);
    return [...s].sort((a, b) => a.localeCompare(b, "ja"));
  }, [items]);

  const marketOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) s.add(classifyMarket(it.marketSegment));
    return MARKET_OPTIONS.filter((o) => s.has(o.value));
  }, [items]);

  const prefectureOptions = useMemo(() => {
    const s = new Set<string>();
    for (const it of items) if (it.prefecture) s.add(it.prefecture);
    return [...s];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (industry && it.entry.industry !== industry) return false;
      if (market && classifyMarket(it.marketSegment) !== market) return false;
      if (prefecture && it.prefecture !== prefecture) return false;
      return true;
    });
  }, [items, industry, market, prefecture]);

  const activeFilters = [industry, market, prefecture].filter(Boolean).length;

  const selectClass =
    "text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all";

  const onReset = () => {
    setIndustry("");
    setMarket("");
    setPrefecture("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            業種 (東証33業種)
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={`w-full ${selectClass}`}
          >
            <option value="">すべての業種</option>
            {industryOptions.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            上場市場
          </label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className={`w-full ${selectClass}`}
          >
            <option value="">すべての市場</option>
            {marketOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            本社所在地
          </label>
          <select
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            className={`w-full ${selectClass}`}
          >
            <option value="">全国</option>
            {prefectureOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
            >
              絞り込みを解除
            </button>
          )}
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {filtered.length} / {items.length} 件
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 px-6 text-slate-500 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          条件に該当する企業がありません
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => (
            <WatchlistCard
              key={it.entry.id}
              entry={it.entry}
              latestFiscalYear={it.latestFiscalYear}
              isNew={it.isNew}
              metrics={it.metrics}
              marketSegment={it.marketSegment}
              prefecture={it.prefecture}
            />
          ))}
        </div>
      )}
    </div>
  );
}
