"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ShareholderSearchForm({
  defaultQ,
}: {
  defaultQ?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQ || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/weekly?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium text-slate-600 mb-1.5">
          保有者名
        </label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="例: ブラックロック、野村、アクティビスト"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-[0.97] shadow-md shadow-blue-500/25 transition-all"
      >
        検索
      </button>
    </form>
  );
}
