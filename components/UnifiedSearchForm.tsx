"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const INDUSTRIES = [
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

const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

export type ListedFilter = "all" | "listed" | "unlisted";

interface Props {
  defaultQ?: string;
  defaultListed?: ListedFilter;
  defaultIndustry?: string;
  defaultYear?: string;
  defaultYearTo?: string;
  defaultCapitalFrom?: string;
  defaultCapitalTo?: string;
  defaultEmployeesFrom?: string;
  defaultEmployeesTo?: string;
  defaultPrefecture?: string;
  defaultSubsidy?: boolean;
  defaultPatent?: boolean;
  defaultCommendation?: boolean;
  defaultFinance?: boolean;
  defaultExist?: boolean;
  defaultBusiness?: string;
  currentYear: number;
}

export default function UnifiedSearchForm({
  defaultQ,
  defaultListed,
  defaultIndustry,
  defaultYear,
  defaultYearTo,
  defaultCapitalFrom,
  defaultCapitalTo,
  defaultEmployeesFrom,
  defaultEmployeesTo,
  defaultPrefecture,
  defaultSubsidy,
  defaultPatent,
  defaultCommendation,
  defaultFinance,
  defaultExist,
  defaultBusiness,
  currentYear,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? defaultQ ?? "");
  const [listed, setListed] = useState<ListedFilter>(
    (sp.get("listed") as ListedFilter) ?? defaultListed ?? "all",
  );
  const [industry, setIndustry] = useState(
    sp.get("industry") ?? defaultIndustry ?? "",
  );
  const [year, setYear] = useState(sp.get("year") ?? defaultYear ?? "");
  const [yearTo, setYearTo] = useState(
    sp.get("year_to") ?? defaultYearTo ?? "",
  );
  const [capitalFrom, setCapitalFrom] = useState(
    sp.get("capital_from") ?? defaultCapitalFrom ?? "",
  );
  const [capitalTo, setCapitalTo] = useState(
    sp.get("capital_to") ?? defaultCapitalTo ?? "",
  );
  const [employeesFrom, setEmployeesFrom] = useState(
    sp.get("employees_from") ?? defaultEmployeesFrom ?? "",
  );
  const [employeesTo, setEmployeesTo] = useState(
    sp.get("employees_to") ?? defaultEmployeesTo ?? "",
  );
  const [prefecture, setPrefecture] = useState(
    sp.get("prefecture") ?? defaultPrefecture ?? "",
  );
  const [business, setBusiness] = useState(
    sp.get("business") ?? defaultBusiness ?? "",
  );
  const [subsidy, setSubsidy] = useState(
    sp.get("subsidy") === "1" || !!defaultSubsidy,
  );
  const [patent, setPatent] = useState(
    sp.get("patent") === "1" || !!defaultPatent,
  );
  const [commendation, setCommendation] = useState(
    sp.get("commendation") === "1" || !!defaultCommendation,
  );
  const [finance, setFinance] = useState(
    sp.get("finance") === "1" || !!defaultFinance,
  );
  const [exist, setExist] = useState(sp.get("exist") === "1" || !!defaultExist);

  const buildUrl = () => {
    const qs = new URLSearchParams();
    qs.set("listed", listed);
    if (q.trim()) qs.set("q", q.trim());
    if (industry) qs.set("industry", industry);
    if (year) qs.set("year", year);
    if (yearTo) qs.set("year_to", yearTo);
    if (capitalFrom) qs.set("capital_from", capitalFrom);
    if (capitalTo) qs.set("capital_to", capitalTo);
    if (employeesFrom) qs.set("employees_from", employeesFrom);
    if (employeesTo) qs.set("employees_to", employeesTo);
    if (prefecture) qs.set("prefecture", prefecture);
    if (business.trim()) qs.set("business", business.trim());
    if (subsidy) qs.set("subsidy", "1");
    if (patent) qs.set("patent", "1");
    if (commendation) qs.set("commendation", "1");
    if (finance) qs.set("finance", "1");
    if (exist) qs.set("exist", "1");
    qs.set("page", "1");
    return `/search?${qs}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl());
  };

  const handleReset = () => {
    setQ("");
    setListed("all");
    setIndustry("");
    setYear("");
    setYearTo("");
    setCapitalFrom("");
    setCapitalTo("");
    setEmployeesFrom("");
    setEmployeesTo("");
    setPrefecture("");
    setBusiness("");
    setSubsidy(false);
    setPatent(false);
    setCommendation(false);
    setFinance(false);
    setExist(false);
    router.push("/search?listed=all&page=1");
  };

  const inputClass =
    "border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 上場区分フィルター */}
      <div className="flex gap-2">
        {(
          [
            { value: "all", label: "すべて" },
            { value: "listed", label: "上場企業のみ" },
            { value: "unlisted", label: "非上場のみ" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setListed(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              listed === opt.value
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 共通検索 */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            企業名
          </label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="例: トヨタ、メルカリ、AI"
            className={`w-full ${inputClass}`}
          />
        </div>

        <div className="min-w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            業種
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={`w-full ${inputClass}`}
          >
            <option value="">すべての業種</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
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
            onChange={(e) => setPrefecture(e.target.value)}
            className={inputClass}
          >
            <option value="">全国</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
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

      {/* gBizINFO 詳細フィルター: 「上場のみ」のとき以外は出す */}
      {listed !== "listed" && (
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                設立年 以降
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputClass}
              >
                <option value="">指定なし</option>
                {Array.from({ length: 30 }, (_, i) => currentYear - i).map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}年以降
                      {y >= currentYear - 3
                        ? " (創業期)"
                        : y >= currentYear - 7
                          ? " (成長期)"
                          : ""}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                設立年 以前
              </label>
              <select
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                className={inputClass}
              >
                <option value="">指定なし</option>
                {Array.from({ length: 30 }, (_, i) => currentYear - i).map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}年以前
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                資本金 下限（円）
              </label>
              <input
                type="number"
                value={capitalFrom}
                onChange={(e) => setCapitalFrom(e.target.value)}
                placeholder="例: 1000000"
                className={`w-40 ${inputClass}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                資本金 上限（円）
              </label>
              <input
                type="number"
                value={capitalTo}
                onChange={(e) => setCapitalTo(e.target.value)}
                placeholder="例: 10000000"
                className={`w-40 ${inputClass}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                従業員数 下限
              </label>
              <input
                type="number"
                value={employeesFrom}
                onChange={(e) => setEmployeesFrom(e.target.value)}
                placeholder="例: 10"
                className={`w-32 ${inputClass}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                従業員数 上限
              </label>
              <input
                type="number"
                value={employeesTo}
                onChange={(e) => setEmployeesTo(e.target.value)}
                placeholder="例: 50"
                className={`w-32 ${inputClass}`}
              />
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                事業項目
              </label>
              <input
                type="text"
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                placeholder="例: ソフトウェア、コンサルティング"
                className={`w-full ${inputClass}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 items-center">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={exist}
                onChange={(e) => setExist(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
              />
              存続中のみ（閉鎖除外）
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={subsidy}
                onChange={(e) => setSubsidy(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
              />
              補助金受給
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={patent}
                onChange={(e) => setPatent(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
              />
              特許保有
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={commendation}
                onChange={(e) => setCommendation(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
              />
              表彰あり
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={finance}
                onChange={(e) => setFinance(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/40"
              />
              財務情報あり
            </label>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">
        {listed === "listed"
          ? "EDINET 上場企業データベース。企業名・業種・都道府県で絞り込み可能。"
          : listed === "unlisted"
            ? "gBizINFO 500万社以上の法人データから上場会社を除外して検索。"
            : ""}
      </p>
    </form>
  );
}
