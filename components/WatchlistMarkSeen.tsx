"use client";

import { useEffect, useRef } from "react";

interface Payload {
  edinetCode: string;
  fiscalYear: number;
  revenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  equity: number | null;
}

/**
 * ウォッチリストページを開いた瞬間に /api/watchlist/seen を叩き、
 * 「新着」として表示されている行のスナップショットを最新値に更新する。
 * これにより次回アクセス時には NEW バッジが消える。
 *
 * 新着が 0 件なら何もしない。mount 時に 1 度だけ実行。
 */
export default function WatchlistMarkSeen({
  payloads,
}: {
  payloads: Payload[];
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    if (payloads.length === 0) return;
    fired.current = true;
    // 個別 POST をまとめて並列送信。失敗しても表示は壊さない。
    Promise.all(
      payloads.map((p) =>
        fetch("/api/watchlist/seen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        }).catch(() => undefined),
      ),
    );
  }, [payloads]);
  return null;
}
