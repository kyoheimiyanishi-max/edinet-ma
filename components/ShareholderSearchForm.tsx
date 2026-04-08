"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ShareholderSort =
  | "date_desc"
  | "date_asc"
  | "ratio_desc"
  | "ratio_asc";

interface Props {
  defaultQ?: string;
  defaultIssuer?: string;
  defaultRatioMin?: string;
  defaultRatioMax?: string;
  defaultDateFrom?: string;
  defaultDateTo?: string;
  defaultSort?: ShareholderSort;
}

export default function ShareholderSearchForm({
  defaultQ,
  defaultIssuer,
  defaultRatioMin,
  defaultRatioMax,
  defaultDateFrom,
  defaultDateTo,
  defaultSort = "date_desc",
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQ || "");
  const [issuer, setIssuer] = useState(defaultIssuer || "");
  const [ratioMin, setRatioMin] = useState(defaultRatioMin || "");
  const [ratioMax, setRatioMax] = useState(defaultRatioMax || "");
  const [dateFrom, setDateFrom] = useState(defaultDateFrom || "");
  const [dateTo, setDateTo] = useState(defaultDateTo || "");
  const [sort, setSort] = useState<ShareholderSort>(defaultSort);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    if (issuer.trim()) qs.set("issuer", issuer.trim());
    if (ratioMin) qs.set("ratio_min", ratioMin);
    if (ratioMax) qs.set("ratio_max", ratioMax);
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo) qs.set("date_to", dateTo);
    if (sort && sort !== "date_desc") qs.set("sort", sort);
    const s = qs.toString();
    router.push(s ? `/shareholders?${s}` : "/shareholders");
  };

  const handleReset = () => {
    setQ("");
    setIssuer("");
    setRatioMin("");
    setRatioMax("");
    setDateFrom("");
    setDateTo("");
    setSort("date_desc");
    router.push("/shareholders");
  };

  const inputCls =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all";
  const labelCls = "block text-sm font-medium text-slate-600 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>保有者名</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="例: ブラックロック、野村、アクティビスト"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>発行会社名</label>
          <input
            type="text"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="例: トヨタ、ソニー"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className={labelCls}>保有割合 最小 (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={ratioMin}
            onChange={(e) => setRatioMin(e.target.value)}
            placeholder="5"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>保有割合 最大 (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={ratioMax}
            onChange={(e) => setRatioMax(e.target.value)}
            placeholder="30"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>報告日 From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>報告日 To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className={labelCls}>並び順</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ShareholderSort)}
            className={inputCls}
          >
            <option value="date_desc">報告日（新しい順）</option>
            <option value="date_asc">報告日（古い順）</option>
            <option value="ratio_desc">保有割合（高い順）</option>
            <option value="ratio_asc">保有割合（低い順）</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-[0.97] transition-all"
          >
            リセット
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-[0.97] shadow-md shadow-blue-500/25 transition-all"
          >
            検索
          </button>
        </div>
      </div>
    </form>
  );
}
