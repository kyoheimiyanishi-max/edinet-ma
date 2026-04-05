"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ShareholderSearchForm({ defaultQ }: { defaultQ?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQ || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) router.push(`/weekly?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">保有者名</label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="例: ブラックロック、野村、アクティビスト"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        検索
      </button>
    </form>
  );
}
