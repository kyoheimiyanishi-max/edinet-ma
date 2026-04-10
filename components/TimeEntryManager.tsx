"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TimeCategory =
  | "初回面談"
  | "面談"
  | "資料作成"
  | "DD"
  | "買手開拓"
  | "AD契約"
  | "NDA"
  | "移動"
  | "社内MTG"
  | "その他";

const CATEGORIES: TimeCategory[] = [
  "初回面談",
  "面談",
  "資料作成",
  "DD",
  "買手開拓",
  "AD契約",
  "NDA",
  "移動",
  "社内MTG",
  "その他",
];

const CATEGORY_COLORS: Record<TimeCategory, string> = {
  初回面談: "bg-slate-100 text-slate-700",
  面談: "bg-blue-100 text-blue-700",
  資料作成: "bg-indigo-100 text-indigo-700",
  DD: "bg-purple-100 text-purple-700",
  買手開拓: "bg-rose-100 text-rose-700",
  AD契約: "bg-amber-100 text-amber-700",
  NDA: "bg-yellow-100 text-yellow-700",
  移動: "bg-gray-100 text-gray-600",
  社内MTG: "bg-cyan-100 text-cyan-700",
  その他: "bg-slate-100 text-slate-600",
};

interface TimeEntry {
  id: string;
  userName: string;
  date: string;
  sellerId?: string;
  sellerName?: string;
  hours: number;
  category: TimeCategory;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface SellerLite {
  id: string;
  companyName: string;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.setDate(diff));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function TimeEntryManager() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [sellers, setSellers] = useState<SellerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [filterUser, setFilterUser] = useState<string>("");

  const fetchData = useCallback(async () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const [eRes, sRes] = await Promise.all([
      fetch(
        `/api/time-entries?from=${formatDate(weekStart)}&to=${formatDate(weekEnd)}`,
      ),
      fetch("/api/sellers"),
    ]);
    setEntries(await eRes.json());
    setSellers(await sRes.json());
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const userOptions = useMemo(() => {
    const set = new Set(entries.map((e) => e.userName));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    if (!filterUser) return entries;
    return entries.filter((e) => e.userName === filterUser);
  }, [entries, filterUser]);

  // Aggregate by day of week + category
  const aggregates = useMemo(() => {
    const byDay: Record<string, number> = {};
    const byCategory: Record<TimeCategory, number> = Object.fromEntries(
      CATEGORIES.map((c) => [c, 0]),
    ) as Record<TimeCategory, number>;
    const byUser: Record<string, number> = {};
    let total = 0;
    for (const e of filtered) {
      total += e.hours;
      byDay[e.date] = (byDay[e.date] ?? 0) + e.hours;
      byCategory[e.category] += e.hours;
      byUser[e.userName] = (byUser[e.userName] ?? 0) + e.hours;
    }
    return { byDay, byCategory, byUser, total };
  }, [filtered]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  }
  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">工数管理</h2>
        <p className="text-sm text-slate-500 mt-1">
          日々の稼働時間を売主案件・カテゴリ別に記録。週次・月次で集計
        </p>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={prevWeek}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            ← 前週
          </button>
          <span className="font-semibold text-slate-800 text-sm">
            {weekStart.toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}{" "}
            〜{" "}
            {new Date(
              weekStart.getTime() + 6 * 24 * 3600 * 1000,
            ).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
          </span>
          <button
            onClick={nextWeek}
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            次週 →
          </button>
          <button
            onClick={() => setWeekStart(getWeekStart(new Date()))}
            className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg font-medium"
          >
            今週
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="">担当者 全て</option>
            {userOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
          >
            + 記録追加
          </button>
        </div>
      </div>

      {showForm && (
        <TimeEntryForm
          sellers={sellers}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await fetchData();
          }}
        />
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="週合計" value={`${aggregates.total.toFixed(1)}h`} />
        <StatCard
          label="1日平均"
          value={`${(aggregates.total / 7).toFixed(1)}h`}
        />
        <StatCard
          label="記録数"
          value={`${filtered.length}件`}
          color="text-blue-700"
        />
        <StatCard
          label="カテゴリ数"
          value={`${Object.values(aggregates.byCategory).filter((v) => v > 0).length}`}
          color="text-indigo-700"
        />
      </div>

      {/* Week grid */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 divide-x divide-slate-100">
          {weekDays.map((d) => {
            const iso = formatDate(d);
            const dayEntries = filtered.filter((e) => e.date === iso);
            const total = aggregates.byDay[iso] ?? 0;
            const isToday = iso === formatDate(new Date());
            return (
              <div
                key={iso}
                className={`p-3 min-h-[220px] ${isToday ? "bg-blue-50/30" : ""}`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">
                      {
                        ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
                          d.getDay()
                        ]
                      }
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {d.getMonth() + 1}/{d.getDate()}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {total.toFixed(1)}h
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dayEntries.map((e) => (
                    <TimeEntryCard key={e.id} entry={e} onRefresh={fetchData} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          カテゴリ別集計
        </h3>
        <div className="space-y-2">
          {CATEGORIES.filter((c) => aggregates.byCategory[c] > 0).map((c) => {
            const hrs = aggregates.byCategory[c];
            const pct =
              aggregates.total > 0 ? (hrs / aggregates.total) * 100 : 0;
            return (
              <div key={c} className="flex items-center gap-3">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold w-20 text-center ${CATEGORY_COLORS[c]}`}
                >
                  {c}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-500 w-16 text-right">
                  {hrs.toFixed(1)}h ({pct.toFixed(0)}%)
                </span>
              </div>
            );
          })}
          {aggregates.total === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">
              今週の記録はまだありません
            </p>
          )}
        </div>
      </div>

      {loading && <p className="text-slate-400 text-center">読み込み中...</p>}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-slate-800",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function TimeEntryCard({
  entry,
  onRefresh,
}: {
  entry: TimeEntry;
  onRefresh: () => Promise<void>;
}) {
  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("この工数記録を削除しますか？")) return;
    await fetch(`/api/time-entries/${entry.id}`, { method: "DELETE" });
    await onRefresh();
  }

  return (
    <div
      className={`rounded px-2 py-1 text-[10px] ${CATEGORY_COLORS[entry.category]} group relative cursor-pointer`}
      title={entry.description ?? ""}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold">{entry.hours}h</span>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700"
        >
          ×
        </button>
      </div>
      <div className="truncate font-medium">{entry.category}</div>
      {entry.sellerName && (
        <div className="truncate opacity-70 text-[9px]">{entry.sellerName}</div>
      )}
      <div className="opacity-60 text-[9px]">{entry.userName}</div>
    </div>
  );
}

function TimeEntryForm({
  sellers,
  onClose,
  onSaved,
}: {
  sellers: SellerLite[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    userName: "",
    date: formatDate(new Date()),
    sellerId: "",
    hours: "1.0",
    category: "面談" as TimeCategory,
    description: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userName.trim() || !form.hours) return;
    setSaving(true);
    try {
      await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: form.userName.trim(),
          date: form.date,
          sellerId: form.sellerId || undefined,
          hours: Number(form.hours),
          category: form.category,
          description: form.description.trim() || undefined,
        }),
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-3"
    >
      <h3 className="font-semibold text-slate-800">工数記録</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            担当者 *
          </label>
          <input
            type="text"
            value={form.userName}
            onChange={(e) => setForm({ ...form, userName: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            日付 *
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            工数 *
          </label>
          <input
            type="number"
            step="0.25"
            min="0"
            max="24"
            value={form.hours}
            onChange={(e) => setForm({ ...form, hours: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            カテゴリ
          </label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as TimeCategory })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          関連売主 (任意)
        </label>
        <select
          value={form.sellerId}
          onChange={(e) => setForm({ ...form, sellerId: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        >
          <option value="">-</option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.companyName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          内容メモ
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}
