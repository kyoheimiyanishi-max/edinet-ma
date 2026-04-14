"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

interface SuggestHit {
  edinetCode: string;
  name: string;
  secCode?: string;
  corporateNumber?: string;
  industry?: string;
  isListed: boolean;
  score: number;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
  /**
   * サジェスト選択時の挙動:
   *  - "set-query": 選択した社名で入力欄を埋めるだけ (検索ボタンで確定)
   *  - "navigate": 企業詳細ページへ即遷移
   * デフォルト "set-query"。
   */
  mode?: "set-query" | "navigate";
}

export default function CompanyAutosuggest({
  value,
  onChange,
  onSubmit,
  placeholder,
  className,
  mode = "set-query",
}: Props) {
  const [hits, setHits] = useState<SuggestHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setHits([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/companies/suggest?q=${encodeURIComponent(q)}&limit=10`,
          { signal: ac.signal },
        );
        if (!res.ok) throw new Error("suggest failed");
        const json = (await res.json()) as { hits: SuggestHit[] };
        setHits(json.hits ?? []);
        setOpen(true);
        setActive(-1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setHits([]);
        }
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const navigateTo = (h: SuggestHit) => {
    const id = h.corporateNumber || h.edinetCode;
    window.location.href = `/company/${id}`;
  };

  const pick = (h: SuggestHit) => {
    if (mode === "navigate") {
      navigateTo(h);
      return;
    }
    onChange(h.name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || hits.length === 0) {
      if (e.key === "Enter" && onSubmit) {
        onSubmit();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + hits.length) % hits.length);
    } else if (e.key === "Enter") {
      if (active >= 0) {
        e.preventDefault();
        pick(hits[active]);
      } else if (onSubmit) {
        onSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          active >= 0 ? `${listboxId}-opt-${active}` : undefined
        }
        autoComplete="off"
        inputMode="search"
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-16 text-base sm:text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
      />
      {loading && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
          検索中…
        </span>
      )}
      {open && hits.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 left-0 right-0 w-full max-h-[min(60vh,20rem)] overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-sm overscroll-contain"
        >
          {hits.map((h, i) => {
            const id = h.corporateNumber || h.edinetCode;
            return (
              <li
                key={h.edinetCode}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(h);
                }}
                className={`px-3 py-2.5 sm:py-2 min-h-11 sm:min-h-0 cursor-pointer flex items-center gap-2 ${
                  i === active ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                    h.isListed
                      ? "bg-blue-50 text-blue-700"
                      : "bg-purple-50 text-purple-700"
                  }`}
                >
                  {h.isListed ? "上場" : "非上場"}
                </span>
                <span className="font-medium text-slate-800 truncate flex-1 min-w-0">
                  {h.name}
                </span>
                {h.secCode && (
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {h.secCode.replace(/0$/, "")}
                  </span>
                )}
                {h.industry && (
                  <span className="hidden md:inline text-[10px] text-slate-400 truncate max-w-28">
                    {h.industry}
                  </span>
                )}
                <Link
                  href={`/company/${id}`}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${h.name} の詳細へ`}
                  className="text-[11px] text-blue-600 hover:underline shrink-0 px-1"
                >
                  <span className="hidden sm:inline">詳細 →</span>
                  <span className="sm:hidden">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
