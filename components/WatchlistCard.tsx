"use client";

import Link from "next/link";
import { useState } from "react";
import MiniSparkline from "./MiniSparkline";

interface MetricView {
  label: string;
  latestText: string;
  changePct: number | null;
  series: { year: number; value: number | null }[];
}

const METRIC_COLORS: Record<string, { positive: string; negative: string }> = {
  売上: { positive: "#3b82f6", negative: "#ef4444" },
  営業利益: { positive: "#10b981", negative: "#ef4444" },
  純利益: { positive: "#8b5cf6", negative: "#ef4444" },
  現預金: { positive: "#84cc16", negative: "#ef4444" },
};

interface Entry {
  id: string;
  companyId: string;
  name: string;
  industry?: string;
  secCode?: string;
  corporateNumber?: string;
  edinetCode?: string;
  note: string | null;
}

interface Props {
  entry: Entry;
  latestFiscalYear: number | null;
  isNew: boolean;
  metrics: MetricView[];
  marketSegment?: string | null;
  prefecture?: string | null;
}

function changeClass(n: number | null): string {
  if (n == null) return "text-slate-400";
  if (n > 0) return "text-emerald-600";
  if (n < 0) return "text-rose-600";
  return "text-slate-500";
}

function formatChange(n: number | null): string {
  if (n == null) return "-";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export default function WatchlistCard({
  entry,
  latestFiscalYear,
  isNew,
  metrics,
  marketSegment,
  prefecture,
}: Props) {
  const [removed, setRemoved] = useState(false);
  const [note, setNote] = useState(entry.note ?? "");
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  if (removed) return null;

  const detailHref = `/company/${entry.corporateNumber || entry.edinetCode || entry.companyId}`;

  const onUnwatch = async () => {
    if (!confirm(`「${entry.name}」をウォッチリストから外しますか？`)) return;
    const qs = new URLSearchParams();
    qs.set("companyId", entry.companyId);
    const res = await fetch(`/api/watchlist?${qs}`, { method: "DELETE" });
    if (res.ok) setRemoved(true);
  };

  const onSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await fetch("/api/watchlist/note", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: entry.companyId,
          note: note.trim() || null,
        }),
      });
      if (res.ok) setEditingNote(false);
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="card-hover bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={detailHref} className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate hover:text-blue-600 transition-colors">
            {entry.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {entry.secCode && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                {entry.secCode.replace(/0$/, "")}
              </span>
            )}
            {entry.industry && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                {entry.industry}
              </span>
            )}
            {marketSegment && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {marketSegment}
              </span>
            )}
            {prefecture && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                {prefecture}
              </span>
            )}
            {isNew && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                NEW
              </span>
            )}
            {latestFiscalYear && (
              <span className="text-[10px] text-slate-400">
                FY{latestFiscalYear}
              </span>
            )}
          </div>
        </Link>
        <button
          type="button"
          onClick={onUnwatch}
          title="ウォッチ解除"
          className="shrink-0 text-[10px] px-2 py-1 rounded-lg text-amber-700 hover:bg-amber-50 font-semibold"
        >
          ★ 解除
        </button>
      </div>

      {metrics.every((m) => m.latestText === "-") ? (
        <p className="text-xs text-slate-400 py-3">
          EDINET 財務データがありません
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m) => {
            const palette = METRIC_COLORS[m.label] ?? {
              positive: "#3b82f6",
              negative: "#ef4444",
            };
            return (
              <div
                key={m.label}
                className="bg-slate-50/80 rounded-lg px-3 py-2 border border-slate-100 flex flex-col gap-1"
              >
                <div className="flex items-baseline justify-between gap-1">
                  <p className="text-[10px] text-slate-400 font-medium">
                    {m.label}
                  </p>
                  <p
                    className={`text-[10px] font-semibold tabular-nums ${changeClass(m.changePct)}`}
                    title="前期比"
                  >
                    {formatChange(m.changePct)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {m.latestText}
                </p>
                <MiniSparkline
                  data={m.series}
                  color={palette.positive}
                  negativeColor={palette.negative}
                  height={36}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-slate-100 pt-2">
        {editingNote ? (
          <div className="space-y-1.5">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="メモ (この企業に関する覚書)"
              rows={2}
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setNote(entry.note ?? "");
                  setEditingNote(false);
                }}
                className="text-[11px] px-2 py-1 text-slate-500 hover:bg-slate-100 rounded"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={onSaveNote}
                disabled={savingNote}
                className="text-[11px] px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="text-left text-xs text-slate-500 hover:text-slate-700 w-full"
          >
            {note.trim() ? (
              <span className="whitespace-pre-wrap">{note}</span>
            ) : (
              <span className="text-slate-400">＋ メモを追加</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
