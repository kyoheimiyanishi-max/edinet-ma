"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface Props {
  defaultRevenueMax: string;
  defaultRevenueMin: string;
  defaultRnd: string;
  defaultSort: string;
  sortOptions: { value: string; label: string }[];
}

const REVENUE_PRESETS = [
  { label: "〜10億円", value: "1000" },
  { label: "〜30億円", value: "3000" },
  { label: "〜50億円", value: "5000" },
  { label: "〜100億円", value: "10000" },
  { label: "〜300億円", value: "30000" },
  { label: "〜500億円", value: "50000" },
];

export default function StartupFilters({
  defaultRevenueMax,
  defaultRevenueMin,
  defaultRnd,
  defaultSort,
  sortOptions,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [revenueMax, setRevenueMax] = useState(searchParams.get("revenue_max") || defaultRevenueMax);
  const [revenueMin, setRevenueMin] = useState(searchParams.get("revenue_min") || defaultRevenueMin);
  const [rnd, setRnd] = useState(searchParams.get("rnd") || defaultRnd);
  const [sort, setSort] = useState(searchParams.get("sort") || defaultSort);

  const apply = (overrides?: Partial<{ revenueMax: string; revenueMin: string; rnd: string; sort: string }>) => {
    const p = new URLSearchParams();
    const rm = overrides?.revenueMax ?? revenueMax;
    const rmin = overrides?.revenueMin ?? revenueMin;
    const r = overrides?.rnd ?? rnd;
    const s = overrides?.sort ?? sort;
    if (rm) p.set("revenue_max", rm);
    if (rmin && rmin !== "0") p.set("revenue_min", rmin);
    if (r && r !== "0") p.set("rnd", r);
    if (s) p.set("sort", s);
    router.push(`/startups?${p}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    apply();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Revenue presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">売上高上限（プリセット）</label>
        <div className="flex flex-wrap gap-2">
          {REVENUE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                setRevenueMax(p.value);
                apply({ revenueMax: p.value });
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                revenueMax === p.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        {/* R&D filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            研究開発費（百万円以上）
          </label>
          <input
            type="number"
            min={0}
            step={10}
            value={rnd}
            onChange={(e) => setRnd(e.target.value)}
            placeholder="0 = フィルタなし"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              apply({ sort: e.target.value });
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          適用
        </button>
      </div>
    </form>
  );
}
