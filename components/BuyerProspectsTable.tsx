"use client";

import { useState } from "react";

type BuyerStatus =
  | "未接触"
  | "アプローチ中"
  | "日程調整中"
  | "アポfix"
  | "アポ調整中"
  | "アポ実施済"
  | "NDAやり取り中"
  | "NDA締結"
  | "開拓済"
  | "開拓済（NDAなし）"
  | "開拓済（NDA締結済み）"
  | "ペンディング";

const STATUSES: BuyerStatus[] = [
  "未接触",
  "アプローチ中",
  "日程調整中",
  "アポfix",
  "アポ調整中",
  "アポ実施済",
  "NDAやり取り中",
  "NDA締結",
  "開拓済",
  "開拓済（NDAなし）",
  "開拓済（NDA締結済み）",
  "ペンディング",
];

export interface BuyerRow {
  id: string;
  name: string;
  corporateNumber: string | null;
  website: string | null;
  buyerStatus: BuyerStatus | null;
  strongBuyer: boolean;
  targetDeal: string | null;
  lastApproachDate: string | null;
  lastApproachMethod: string | null;
  ndaDate: string | null;
  buyerAssignedTo: string | null;
  notes: string | null;
}

export default function BuyerProspectsTable({
  companies,
  statusColors,
}: {
  companies: BuyerRow[];
  statusColors: Record<BuyerStatus, string>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<BuyerRow>>({});
  const [saving, setSaving] = useState(false);

  function startEdit(row: BuyerRow) {
    setEditingId(row.id);
    setDraft({
      buyerStatus: row.buyerStatus,
      strongBuyer: row.strongBuyer,
      targetDeal: row.targetDeal,
      lastApproachDate: row.lastApproachDate,
      lastApproachMethod: row.lastApproachMethod,
      ndaDate: row.ndaDate,
      buyerAssignedTo: row.buyerAssignedTo,
    });
  }

  async function handleSave(id: string) {
    setSaving(true);
    try {
      await fetch(`/api/companies/${id}/buyer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerStatus: draft.buyerStatus || null,
          strongBuyer: draft.strongBuyer ?? false,
          targetDeal: draft.targetDeal || null,
          lastApproachDate: draft.lastApproachDate || null,
          lastApproachMethod: draft.lastApproachMethod || null,
          ndaDate: draft.ndaDate || null,
          buyerAssignedTo: draft.buyerAssignedTo || null,
        }),
      });
      // Server-rendered page なので fetch 再実行ではなく Reload で同期
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        該当する買手候補が見つかりませんでした
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold text-slate-500">
              <th className="px-4 py-3">会社名</th>
              <th className="px-3 py-3">開拓状況</th>
              <th className="px-3 py-3">★</th>
              <th className="px-3 py-3">対象案件</th>
              <th className="px-3 py-3">最終アプローチ</th>
              <th className="px-3 py-3">NDA</th>
              <th className="px-3 py-3">担当</th>
              <th className="px-3 py-3 sticky right-0 bg-slate-50">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => {
              const isEditing = editingId === c.id;
              return (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5">
                    <div className="min-w-0">
                      {c.corporateNumber ? (
                        <a
                          href={`/company/${c.corporateNumber}`}
                          className="font-medium text-slate-800 hover:text-blue-600 truncate block max-w-[240px]"
                        >
                          {c.name}
                        </a>
                      ) : (
                        <span className="font-medium text-slate-800 truncate block max-w-[240px]">
                          {c.name}
                        </span>
                      )}
                      {c.website && (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-400 hover:text-blue-500 truncate block max-w-[240px]"
                        >
                          {c.website}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <select
                        value={draft.buyerStatus ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            buyerStatus:
                              (e.target.value as BuyerStatus) || null,
                          })
                        }
                        className="px-2 py-1 rounded border border-slate-200 text-xs"
                      >
                        <option value="">-</option>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : c.buyerStatus ? (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[c.buyerStatus]}`}
                      >
                        {c.buyerStatus}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={draft.strongBuyer ?? false}
                        onChange={(e) =>
                          setDraft({ ...draft, strongBuyer: e.target.checked })
                        }
                        className="rounded"
                      />
                    ) : c.strongBuyer ? (
                      <span className="text-rose-500 font-bold">★</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft.targetDeal ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            targetDeal: e.target.value || null,
                          })
                        }
                        className="px-2 py-1 rounded border border-slate-200 text-xs w-28"
                      />
                    ) : (
                      <span className="text-slate-600 text-xs truncate block max-w-[140px]">
                        {c.targetDeal ?? "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          type="date"
                          value={draft.lastApproachDate ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              lastApproachDate: e.target.value || null,
                            })
                          }
                          className="px-2 py-1 rounded border border-slate-200 text-xs"
                        />
                        <input
                          type="text"
                          value={draft.lastApproachMethod ?? ""}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              lastApproachMethod: e.target.value || null,
                            })
                          }
                          placeholder="方法"
                          className="px-2 py-1 rounded border border-slate-200 text-xs w-24 block"
                        />
                      </div>
                    ) : c.lastApproachDate ? (
                      <div className="text-xs text-slate-600">
                        <div>{c.lastApproachDate}</div>
                        {c.lastApproachMethod && (
                          <div className="text-slate-400 text-[10px]">
                            {c.lastApproachMethod}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <input
                        type="date"
                        value={draft.ndaDate ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            ndaDate: e.target.value || null,
                          })
                        }
                        className="px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    ) : (
                      <span className="text-xs text-slate-600">
                        {c.ndaDate ?? "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft.buyerAssignedTo ?? ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            buyerAssignedTo: e.target.value || null,
                          })
                        }
                        className="px-2 py-1 rounded border border-slate-200 text-xs w-20"
                      />
                    ) : (
                      <span className="text-xs text-slate-600">
                        {c.buyerAssignedTo ?? "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 sticky right-0 bg-white">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSave(c.id)}
                          disabled={saving}
                          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "..." : "保存"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(c)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      >
                        編集
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
