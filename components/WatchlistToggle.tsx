"use client";

import { useEffect, useState } from "react";

interface Props {
  /**
   * 企業詳細ページから渡される識別子。d6e 側で corporate_number /
   * edinet_code から companies.id を解決する。
   */
  corporateNumber?: string;
  edinetCode?: string;
}

/**
 * 企業詳細ページに表示する「☆ ウォッチ」トグル。
 *
 * 実装方針:
 * - 初期描画時に /api/watchlist を叩き、現在ユーザーが既にウォッチしているか
 *   (companyId または corporate_number / edinet_code ベース) を判定。
 * - トグル時は楽観的更新 (state を即時反転) → API 呼び出し → 失敗時は元に戻す。
 */
export default function WatchlistToggle({
  corporateNumber,
  edinetCode,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [watched, setWatched] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const r = await fetch("/api/watchlist", { cache: "no-store" });
        if (!r.ok) {
          if (!aborted) setLoaded(true);
          return;
        }
        const j = (await r.json()) as {
          entries: {
            company: { corporateNumber?: string; edinetCode?: string };
          }[];
        };
        if (aborted) return;
        const match = j.entries.some(
          (e) =>
            (corporateNumber &&
              e.company.corporateNumber === corporateNumber) ||
            (edinetCode && e.company.edinetCode === edinetCode),
        );
        setWatched(match);
      } catch {
        // noop
      } finally {
        if (!aborted) setLoaded(true);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [corporateNumber, edinetCode]);

  const onToggle = async () => {
    if (busy) return;
    const next = !watched;
    setWatched(next); // 楽観的
    setBusy(true);
    try {
      if (next) {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ corporateNumber, edinetCode }),
        });
        if (!res.ok) throw new Error("add failed");
      } else {
        const qs = new URLSearchParams();
        if (corporateNumber) qs.set("corporateNumber", corporateNumber);
        if (edinetCode) qs.set("edinetCode", edinetCode);
        const res = await fetch(`/api/watchlist?${qs}`, { method: "DELETE" });
        if (!res.ok) throw new Error("delete failed");
      }
    } catch {
      setWatched(!next); // ロールバック
    } finally {
      setBusy(false);
    }
  };

  const disabled = !loaded || (!corporateNumber && !edinetCode);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled || busy}
      aria-pressed={watched}
      title={
        !corporateNumber && !edinetCode
          ? "法人番号 / EDINETコード が無いためウォッチできません"
          : watched
            ? "ウォッチ解除"
            : "ウォッチリストに追加"
      }
      className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all inline-flex items-center gap-1 ${
        watched
          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span aria-hidden>{watched ? "★" : "☆"}</span>
      <span>{watched ? "ウォッチ中" : "ウォッチ"}</span>
    </button>
  );
}
