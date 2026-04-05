"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface Props {
  defaultName?: string;
  defaultYear?: string;
  defaultCapitalTo?: string;
  defaultEmployeesTo?: string;
  defaultPrefecture?: string;
  defaultSubsidy?: boolean;
  defaultPatent?: boolean;
  prefectures: string[];
  currentYear: number;
}

export default function GBizSearchForm({
  defaultName,
  defaultYear,
  defaultCapitalTo,
  defaultEmployeesTo,
  defaultPrefecture,
  defaultSubsidy,
  defaultPatent,
  prefectures,
  currentYear,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(
    searchParams.get("name") ?? defaultName ?? "",
  );
  const [year, setYear] = useState(
    searchParams.get("year") ?? defaultYear ?? String(currentYear - 5),
  );
  const [capitalTo, setCapitalTo] = useState(
    searchParams.get("capital_to") ?? defaultCapitalTo ?? "",
  );
  const [employeesTo, setEmployeesTo] = useState(
    searchParams.get("employees_to") ?? defaultEmployeesTo ?? "",
  );
  const [prefecture, setPrefecture] = useState(
    searchParams.get("prefecture") ?? defaultPrefecture ?? "",
  );
  const [subsidy, setSubsidy] = useState(
    searchParams.get("subsidy") === "1" || !!defaultSubsidy,
  );
  const [patent, setPatent] = useState(
    searchParams.get("patent") === "1" || !!defaultPatent,
  );

  const buildUrl = (
    overrides?: Record<string, string | boolean | undefined>,
  ) => {
    const v = {
      name,
      year,
      capitalTo,
      employeesTo,
      prefecture,
      subsidy,
      patent,
      ...overrides,
    };
    const qs = new URLSearchParams();
    if (v.name) qs.set("name", String(v.name));
    if (v.year) qs.set("year", String(v.year));
    if (v.capitalTo) qs.set("capital_to", String(v.capitalTo));
    if (v.employeesTo) qs.set("employees_to", String(v.employeesTo));
    if (v.prefecture) qs.set("prefecture", String(v.prefecture));
    if (v.subsidy) qs.set("subsidy", "1");
    if (v.patent) qs.set("patent", "1");
    qs.set("page", "1");
    return `/startups?${qs}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl());
  };

  const inputClass =
    "border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            企業名
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: メルカリ、AI、テクノロジー"
            className={`w-full ${inputClass}`}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            設立年（以降）
          </label>
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              router.push(buildUrl({ year: e.target.value }));
            }}
            className={inputClass}
          >
            {Array.from({ length: 16 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>
                {y}年以降
                {y >= currentYear - 3
                  ? " (創業期)"
                  : y >= currentYear - 7
                    ? " (成長期)"
                    : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            都道府県
          </label>
          <select
            value={prefecture}
            onChange={(e) => {
              setPrefecture(e.target.value);
              router.push(buildUrl({ prefecture: e.target.value }));
            }}
            className={inputClass}
          >
            <option value="">全国</option>
            {prefectures.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            資本金上限（円）
          </label>
          <input
            type="number"
            value={capitalTo}
            onChange={(e) => setCapitalTo(e.target.value)}
            placeholder="例: 10000000"
            className={`w-44 ${inputClass}`}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            従業員数上限
          </label>
          <input
            type="number"
            value={employeesTo}
            onChange={(e) => setEmployeesTo(e.target.value)}
            placeholder="例: 50"
            className={`w-36 ${inputClass}`}
          />
        </div>

        <div className="flex gap-4 items-center pb-1">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={subsidy}
              onChange={(e) => {
                setSubsidy(e.target.checked);
                router.push(buildUrl({ subsidy: e.target.checked }));
              }}
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500/40"
            />
            <span className="group-hover:text-slate-800 transition-colors">
              補助金受給
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={patent}
              onChange={(e) => {
                setPatent(e.target.checked);
                router.push(buildUrl({ patent: e.target.checked }));
              }}
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500/40"
            />
            <span className="group-hover:text-slate-800 transition-colors">
              特許保有
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="bg-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 active:scale-[0.97] shadow-md shadow-purple-500/25 transition-all"
        >
          検索
        </button>
        <button
          type="button"
          onClick={() =>
            router.push("/startups?year=" + (currentYear - 5) + "&page=1")
          }
          className="border border-slate-200 text-slate-500 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 hover:text-slate-700 transition-all"
        >
          リセット
        </button>
      </div>

      <p className="text-xs text-slate-400">
        出典: 経済産業省 gBizINFO —
        500万社以上の政府保有法人データ。設立年・都道府県・資本金・従業員数で絞り込み可能。
      </p>
    </form>
  );
}
