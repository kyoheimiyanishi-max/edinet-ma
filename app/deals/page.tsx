import {
  getAllDeals,
  formatAmount,
  getDealStatusColor,
  getDealCategoryColor,
} from "@/lib/deals";

export default async function DealsPage() {
  const deals = await getAllDeals();

  const totalAmount = deals.reduce((sum, d) => sum + d.amount, 0);
  const completedCount = deals.filter((d) => d.status === "完了").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">M&A 案件一覧</h2>
        <p className="text-sm text-slate-500 mt-1">
          主要な買収・合併案件の情報と取引金額
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">総案件数</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {deals.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">完了案件</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {completedCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">進行中</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {deals.length - completedCount}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">総取引額</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            {formatAmount(totalAmount)}
          </p>
        </div>
      </div>

      {/* 案件テーブル */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  日付
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  買収者
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  対象企業
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  種別
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ステータス
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deals.map((deal) => (
                <tr
                  key={deal.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-5 py-4 whitespace-nowrap text-slate-500 tabular-nums">
                    {deal.date}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-800">
                      {deal.buyer}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-slate-700">{deal.target}</span>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <span className="font-bold text-indigo-600 tabular-nums">
                      {formatAmount(deal.amount)}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getDealCategoryColor(deal.category)}`}
                    >
                      {deal.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${getDealStatusColor(deal.status)}`}
                    >
                      {deal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詳細カード（モバイル向け） */}
      <div className="sm:hidden space-y-3">
        <h3 className="text-sm font-semibold text-slate-500">案件詳細</h3>
        {deals.map((deal) => (
          <div
            key={`card-${deal.id}`}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  {deal.buyer}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">→ {deal.target}</p>
              </div>
              <span className="font-bold text-indigo-600 text-sm whitespace-nowrap">
                {formatAmount(deal.amount)}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {deal.summary}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400 tabular-nums">
                {deal.date}
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getDealCategoryColor(deal.category)}`}
              >
                {deal.category}
              </span>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getDealStatusColor(deal.status)}`}
              >
                {deal.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-center">
        ※ 金額は公開情報に基づく概算値です。実際の取引額と異なる場合があります。
      </p>
    </div>
  );
}
