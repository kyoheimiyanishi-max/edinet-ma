"use client";

import { useMemo, useState } from "react";
import ExpandableLinkList, { type LineItem } from "./ExpandableLinkList";

export interface NewsFilter {
  id: string;
  label: string;
}

interface Props {
  title: string;
  badge?: string;
  items: LineItem[];
  filters: NewsFilter[];
  emptyText: string;
  aiSummary?: string;
}

const ALL_ID = "all";

export default function NewsFilterSection({
  title,
  badge,
  items,
  filters,
  emptyText,
  aiSummary,
}: Props) {
  const [activeId, setActiveId] = useState<string>(ALL_ID);

  const counts = useMemo(() => {
    const m: Record<string, number> = { [ALL_ID]: items.length };
    for (const f of filters) {
      if (f.id === ALL_ID) continue;
      let n = 0;
      for (const item of items) {
        if (item.categories?.includes(f.id)) n += 1;
      }
      m[f.id] = n;
    }
    return m;
  }, [items, filters]);

  const filtered = useMemo(() => {
    if (activeId === ALL_ID) return items;
    return items.filter((item) => item.categories?.includes(activeId));
  }, [items, activeId]);

  const hasAll = filters.some((f) => f.id === ALL_ID);
  const resolvedFilters: NewsFilter[] = hasAll
    ? filters
    : [{ id: ALL_ID, label: "全て" }, ...filters];

  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <h3 className="font-semibold text-slate-700">{title}</h3>
          {badge ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="flex-1 min-w-0 text-left">
          {items.length === 0 ? (
            <span className="text-sm text-slate-400">{emptyText}</span>
          ) : aiSummary ? (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold shrink-0"
                title="Claude AI による要約"
              >
                ✨ AI
              </span>
              <span
                className="text-sm text-slate-700 truncate"
                title={aiSummary}
              >
                {aiSummary}
              </span>
              <span className="text-[10px] text-slate-400 shrink-0">
                {items.length} 件
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="px-6 pt-4 flex flex-wrap gap-2">
          {resolvedFilters.map((f) => {
            const isActive = f.id === activeId;
            const count = counts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveId(f.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
                <span
                  className={`ml-1.5 text-[10px] ${
                    isActive ? "opacity-90" : "text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="p-6 pt-4">
        <ExpandableLinkList
          key={activeId}
          items={filtered}
          emptyText={
            activeId === ALL_ID ? emptyText : "該当するニュースがありません"
          }
        />
      </div>
    </section>
  );
}
