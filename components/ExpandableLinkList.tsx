"use client";

import { useState } from "react";

export interface LineItem {
  title: string;
  url: string;
  source?: string;
  date?: string;
  description?: string;
  categories?: string[];
}

interface Props {
  items: LineItem[];
  emptyText: string;
  initialCount?: number;
  pageSize?: number;
}

const DEFAULT_INITIAL = 5;
const DEFAULT_PAGE = 10;

export default function ExpandableLinkList({
  items,
  emptyText,
  initialCount = DEFAULT_INITIAL,
  pageSize = DEFAULT_PAGE,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(pageSize);

  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">{emptyText}</p>
    );
  }

  const shown = expanded
    ? items.slice(0, visibleCount)
    : items.slice(0, initialCount);
  const expandedRemaining = expanded
    ? Math.max(0, items.length - shown.length)
    : 0;

  return (
    <div className="space-y-2">
      {shown.map((item, i) => (
        <a
          key={`${item.url}-${i}`}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
        >
          <p className="text-sm text-slate-800 font-medium line-clamp-2">
            {item.title}
          </p>
          {item.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {item.source && (
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                {item.source}
              </span>
            )}
            {item.date && (
              <span className="text-[10px] text-slate-400">{item.date}</span>
            )}
          </div>
        </a>
      ))}

      {!expanded && items.length > initialCount && (
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            setVisibleCount(pageSize);
          }}
          className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-xl font-semibold transition-colors border border-blue-200 bg-blue-50/40"
        >
          ▼ もっと見る（残り {items.length - initialCount} 件）
        </button>
      )}

      {expanded && expandedRemaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((v) => v + pageSize)}
          className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-xl font-semibold transition-colors border border-blue-200 bg-blue-50/40"
        >
          ＋ さらに {Math.min(pageSize, expandedRemaining)} 件 読み込む（残り{" "}
          {expandedRemaining} 件）
        </button>
      )}

      {expanded && (
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setVisibleCount(pageSize);
          }}
          className="w-full py-1.5 text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors"
        >
          ▲ 折りたたむ
        </button>
      )}
    </div>
  );
}
