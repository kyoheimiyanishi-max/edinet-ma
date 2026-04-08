"use client";

import { useState, useEffect, useRef } from "react";

interface Seller {
  id: string;
  companyName: string;
  stage: string;
}

interface Props {
  companyName: string;
  companyCode?: string;
  industry?: string;
}

export default function AddToSellerButton({
  companyName,
  companyCode,
  industry,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || sellers !== null) return;
    fetch("/api/sellers")
      .then((r) => r.json())
      .then((data: Seller[]) => setSellers(data))
      .catch(() => setSellers([]));
  }, [open, sellers]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function addToSeller(sellerId: string) {
    setBusyId(sellerId);
    setMessage(null);
    try {
      const res = await fetch(`/api/sellers/${sellerId}/buyers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyCode,
          industry,
          source: "manual",
          reasoning: "企業検索から追加",
          status: "候補",
        }),
      });
      if (res.ok) {
        setMessage("✓ 追加しました");
        setTimeout(() => {
          setOpen(false);
          setMessage(null);
        }, 800);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error || "失敗");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold transition-colors"
      >
        + 売主に紐付け
      </button>
      {open && (
        <div
          onClick={(e) => e.preventDefault()}
          className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl border border-slate-200 shadow-xl z-20 overflow-hidden"
        >
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">
            買い手として追加する売主を選択
          </div>
          {message && (
            <div className="px-3 py-2 text-xs text-emerald-700 bg-emerald-50 border-b border-emerald-100">
              {message}
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {sellers === null ? (
              <div className="p-4 text-xs text-slate-400 text-center">
                読み込み中...
              </div>
            ) : sellers.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 text-center">
                売主が未登録です。
                <br />
                <a href="/deals" className="text-blue-600 hover:underline">
                  売主管理ページ
                </a>
                で登録してください
              </div>
            ) : (
              sellers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToSeller(s.id);
                  }}
                  disabled={busyId === s.id}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-slate-50 last:border-0 flex items-center justify-between gap-2 disabled:opacity-50"
                >
                  <span className="truncate font-medium text-slate-800">
                    {s.companyName}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                    {s.stage}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
