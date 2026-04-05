"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const INDUSTRIES = [
  "水産・農林業", "鉱業", "建設業", "食料品", "繊維製品", "パルプ・紙",
  "化学", "医薬品", "石油・石炭製品", "ゴム製品", "ガラス・土石製品",
  "鉄鋼", "非鉄金属", "金属製品", "機械", "電気機器", "輸送用機器",
  "精密機器", "その他製品", "電気・ガス業", "陸運業", "海運業", "空運業",
  "倉庫・運輸関連業", "情報・通信業", "卸売業", "小売業", "銀行業",
  "証券、商品先物取引業", "保険業", "その他金融業", "不動産業", "サービス業",
];

interface Props {
  defaultQ?: string;
  defaultIndustry?: string;
}

export default function SearchForm({ defaultQ, defaultIndustry }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || defaultQ || "");
  const [industry, setIndustry] = useState(searchParams.get("industry") || defaultIndustry || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (industry) params.set("industry", industry);
    router.push(`/?${params}`);
  };

  const handleReset = () => {
    setQ("");
    setIndustry("");
    router.push("/");
  };

  return (
    <form onSubmit={handleSearch} className="space-y-3">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">企業名・EDINETコード</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="例: トヨタ、E02143"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="min-w-40">
          <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべての業種</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          検索
        </button>
        <button type="button" onClick={handleReset} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
          リセット
        </button>
      </div>
      <p className="text-xs text-gray-400">
        企業名で検索するか、業種で絞り込んでください。企業カードをクリックすると詳細・大量保有報告書を閲覧できます。
      </p>
    </form>
  );
}
