"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export const INDUSTRIES = [
  "水産・農林業",
  "鉱業",
  "建設業",
  "食料品",
  "繊維製品",
  "パルプ・紙",
  "化学",
  "医薬品",
  "石油・石炭製品",
  "ゴム製品",
  "ガラス・土石製品",
  "鉄鋼",
  "非鉄金属",
  "金属製品",
  "機械",
  "電気機器",
  "輸送用機器",
  "精密機器",
  "その他製品",
  "電気・ガス業",
  "陸運業",
  "海運業",
  "空運業",
  "倉庫・運輸関連業",
  "情報・通信業",
  "卸売業",
  "小売業",
  "銀行業",
  "証券、商品先物取引業",
  "保険業",
  "その他金融業",
  "不動産業",
  "サービス業",
];

export const INDUSTRY_CATEGORIES: Record<string, string[]> = {
  "製造業": ["食料品", "繊維製品", "パルプ・紙", "化学", "医薬品", "石油・石炭製品", "ゴム製品", "ガラス・土石製品", "鉄鋼", "非鉄金属", "金属製品", "機械", "電気機器", "輸送用機器", "精密機器", "その他製品"],
  "金融・保険": ["銀行業", "証券、商品先物取引業", "保険業", "その他金融業"],
  "情報・通信": ["情報・通信業"],
  "運輸・物流": ["陸運業", "海運業", "空運業", "倉庫・運輸関連業"],
  "商業・流通": ["卸売業", "小売業"],
  "インフラ・資源": ["電気・ガス業", "鉱業", "水産・農林業"],
  "建設・不動産": ["建設業", "不動産業"],
  "サービス": ["サービス業"],
};

export const CREDIT_RATINGS = ["S", "A", "B", "C"];

interface Props {
  defaultQ?: string;
  defaultIndustry?: string;
  defaultRating?: string;
}

export default function SearchForm({
  defaultQ,
  defaultIndustry,
  defaultRating,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || defaultQ || "");
  const [industry, setIndustry] = useState(
    searchParams.get("industry") || defaultIndustry || "",
  );
  const [rating, setRating] = useState(
    searchParams.get("rating") || defaultRating || "",
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (industry) params.set("industry", industry);
    if (rating) params.set("rating", rating);
    router.push(`/search?${params}`);
  };

  const handleReset = () => {
    setQ("");
    setIndustry("");
    setRating("");
    router.push("/search");
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            企業名・EDINETコード
          </label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="例: トヨタ、エフコード、E02143"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="min-w-40">
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            業種
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
          >
            <option value="">すべての業種</option>
            {Object.entries(INDUSTRY_CATEGORIES).map(([cat, industries]) => (
              <optgroup key={cat} label={`── ${cat}`}>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="min-w-32">
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            信用格付け
          </label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all"
          >
            <option value="">すべて</option>
            {CREDIT_RATINGS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-[0.97] shadow-md shadow-blue-500/25 transition-all"
        >
          検索
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="border border-slate-200 text-slate-500 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 hover:text-slate-700 transition-all"
        >
          リセット
        </button>
      </div>
      <p className="text-xs text-slate-400">
        企業名の一部でも検索できます（カタカナ・ひらがな・英語OK）。業種・信用格付けで絞り込み可能です。
      </p>
    </form>
  );
}
