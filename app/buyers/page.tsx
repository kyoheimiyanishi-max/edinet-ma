import { Suspense } from "react";
import {
  search as searchCompanies,
  BUYER_PROSPECT_STATUSES,
  type BuyerProspectStatus,
} from "@/lib/d6e/repos/companies";
import BuyerProspectsTable from "@/components/BuyerProspectsTable";

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    assignee?: string;
    strong?: string;
  }>;
}

const STATUS_COLORS: Record<BuyerProspectStatus, string> = {
  未接触: "bg-slate-100 text-slate-600",
  アプローチ中: "bg-blue-100 text-blue-700",
  日程調整中: "bg-cyan-100 text-cyan-700",
  アポfix: "bg-purple-100 text-purple-700",
  アポ調整中: "bg-indigo-100 text-indigo-700",
  アポ実施済: "bg-violet-100 text-violet-700",
  NDAやり取り中: "bg-amber-100 text-amber-700",
  NDA締結: "bg-amber-200 text-amber-800",
  開拓済: "bg-emerald-100 text-emerald-700",
  "開拓済（NDAなし）": "bg-emerald-100 text-emerald-600",
  "開拓済（NDA締結済み）": "bg-emerald-200 text-emerald-800",
  ペンディング: "bg-rose-100 text-rose-700",
};

export default async function BuyersPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  const status = params.status as BuyerProspectStatus | undefined;
  const assignee = params.assignee;
  const strongOnly = params.strong === "1";

  // 全買手プロスペクトを取得 (上限引き上げ)
  const all = await searchCompanies({
    isBuyer: true,
    ...(q ? { query: q } : {}),
    ...(status ? { buyerStatus: status } : {}),
    ...(assignee ? { buyerAssignedTo: assignee } : {}),
    ...(strongOnly ? { strongBuyer: true } : {}),
    limit: 5000,
  });

  // ファセット集計
  const statusCounts: Record<string, number> = {};
  const assigneeSet = new Set<string>();
  for (const c of all) {
    if (c.buyerStatus) {
      statusCounts[c.buyerStatus] = (statusCounts[c.buyerStatus] ?? 0) + 1;
    }
    if (c.buyerAssignedTo) assigneeSet.add(c.buyerAssignedTo);
  }
  const totalCount = all.length;
  const strongCount = all.filter((c) => c.strongBuyer).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">買手開拓</h2>
        <p className="text-sm text-slate-500 mt-1">
          売主案件にマッチする買い手候補企業を一元管理。アプローチ状況・NDA・担当者で絞り込み可能
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="買手候補総数" value={totalCount} />
        <SummaryCard
          label="アプローチ中"
          value={statusCounts["アプローチ中"] ?? 0}
          color="text-blue-700"
        />
        <SummaryCard
          label="開拓済"
          value={
            (statusCounts["開拓済"] ?? 0) +
            (statusCounts["開拓済（NDA締結済み）"] ?? 0)
          }
          color="text-emerald-700"
        />
        <SummaryCard
          label="ストロングバイヤー"
          value={strongCount}
          color="text-rose-700"
        />
      </div>

      {/* Filters (form-based, server side) */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <form className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="会社名・URL で検索..."
            className="sm:col-span-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">開拓状況 全て</option>
            {BUYER_PROSPECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="assignee"
            defaultValue={assignee ?? ""}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">担当者 全て</option>
            {Array.from(assigneeSet)
              .sort()
              .map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 flex-1">
              <input
                type="checkbox"
                name="strong"
                value="1"
                defaultChecked={strongOnly}
                className="rounded"
              />
              ストロング
            </label>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
            >
              絞込
            </button>
          </div>
        </form>
        {(q || status || assignee || strongOnly) && (
          <div className="mt-3 text-xs text-slate-500">
            <span className="font-medium">{totalCount} 件</span>
            {" 該当 "}
            <a
              href="/buyers"
              className="ml-2 px-2 py-0.5 rounded text-rose-600 hover:bg-rose-50 font-medium"
            >
              フィルタクリア
            </a>
          </div>
        )}
      </div>

      {/* Table */}
      <Suspense fallback={<div className="text-slate-400">読み込み中...</div>}>
        <BuyerProspectsTable
          companies={all.map((c) => ({
            id: c.id,
            name: c.name,
            corporateNumber: c.corporateNumber ?? null,
            website: c.website ?? null,
            buyerStatus: c.buyerStatus ?? null,
            strongBuyer: c.strongBuyer,
            targetDeal: c.targetDeal ?? null,
            lastApproachDate: c.lastApproachDate ?? null,
            lastApproachMethod: c.lastApproachMethod ?? null,
            ndaDate: c.ndaDate ?? null,
            buyerAssignedTo: c.buyerAssignedTo ?? null,
            notes: c.notes ?? null,
          }))}
          statusColors={STATUS_COLORS}
        />
      </Suspense>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = "text-blue-700",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
