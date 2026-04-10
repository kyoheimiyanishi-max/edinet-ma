"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type EventType =
  | "初回面談"
  | "面談"
  | "訪問"
  | "電話"
  | "社内MTG"
  | "イベント"
  | "セミナー"
  | "展示会"
  | "その他";

type EventStatus = "予定" | "完了" | "キャンセル" | "延期";

const EVENT_TYPES: EventType[] = [
  "初回面談",
  "面談",
  "訪問",
  "電話",
  "社内MTG",
  "イベント",
  "セミナー",
  "展示会",
  "その他",
];
const EVENT_STATUSES: EventStatus[] = ["予定", "完了", "キャンセル", "延期"];

const TYPE_COLORS: Record<EventType, string> = {
  初回面談: "bg-slate-100 text-slate-700",
  面談: "bg-blue-100 text-blue-700",
  訪問: "bg-indigo-100 text-indigo-700",
  電話: "bg-cyan-100 text-cyan-700",
  社内MTG: "bg-gray-100 text-gray-600",
  イベント: "bg-purple-100 text-purple-700",
  セミナー: "bg-rose-100 text-rose-700",
  展示会: "bg-amber-100 text-amber-700",
  その他: "bg-slate-100 text-slate-600",
};
const STATUS_COLORS: Record<EventStatus, string> = {
  予定: "bg-blue-100 text-blue-700",
  完了: "bg-emerald-100 text-emerald-700",
  キャンセル: "bg-rose-100 text-rose-700",
  延期: "bg-amber-100 text-amber-700",
};

interface CalendarEvent {
  id: string;
  title: string;
  eventType: EventType;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  sellerId?: string;
  sellerName?: string;
  buyerCompanyId?: string;
  buyerCompanyName?: string;
  attendees: string[];
  description?: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

interface SellerLite {
  id: string;
  companyName: string;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function EventsManager() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sellers, setSellers] = useState<SellerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<{
    type: EventType | "";
    status: EventStatus | "";
    search: string;
  }>({ type: "", status: "", search: "" });

  const fetchData = useCallback(async () => {
    const [eRes, sRes] = await Promise.all([
      fetch("/api/events"),
      fetch("/api/sellers"),
    ]);
    setEvents(await eRes.json());
    setSellers(await sRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter.type && e.eventType !== filter.type) return false;
      if (filter.status && e.status !== filter.status) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const hay = [
          e.title,
          e.location,
          e.sellerName,
          e.buyerCompanyName,
          e.description,
          ...e.attendees,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, filter]);

  const today = formatDate(new Date());
  const upcoming = filtered.filter(
    (e) => e.date >= today && e.status === "予定",
  );
  const past = filtered.filter((e) => e.date < today || e.status !== "予定");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">イベント管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            面談・訪問・社内MTG・イベントを一元管理。売主/買い手との紐付けが可能
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-md"
        >
          + 新規イベント
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="全イベント" value={events.length} />
        <StatCard
          label="予定 (今後)"
          value={
            events.filter((e) => e.date >= today && e.status === "予定").length
          }
          color="text-blue-700"
        />
        <StatCard
          label="今週"
          value={
            events.filter((e) => {
              const d = new Date(e.date);
              const diff = Math.floor(
                (d.getTime() - Date.now()) / (24 * 3600 * 1000),
              );
              return diff >= 0 && diff <= 7;
            }).length
          }
          color="text-indigo-700"
        />
        <StatCard
          label="完了"
          value={events.filter((e) => e.status === "完了").length}
          color="text-emerald-700"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            placeholder="タイトル・場所・参加者で検索..."
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <select
            value={filter.type}
            onChange={(e) =>
              setFilter({ ...filter, type: e.target.value as EventType | "" })
            }
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="">種別 全て</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={filter.status}
            onChange={(e) =>
              setFilter({
                ...filter,
                status: e.target.value as EventStatus | "",
              })
            }
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
          >
            <option value="">状態 全て</option>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showForm && (
        <EventForm
          sellers={sellers}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await fetchData();
          }}
        />
      )}

      {/* Upcoming */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-600">
          今後の予定 ({upcoming.length})
        </h3>
        {loading ? (
          <p className="text-slate-400 text-center py-6">読み込み中...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-slate-400 text-center py-6 bg-white rounded-2xl border border-slate-200/60">
            予定なし
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <EventRow key={e.id} event={e} onRefresh={fetchData} />
            ))}
          </div>
        )}
      </div>

      {/* Past / Completed */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-600">
            完了/過去 ({past.length})
          </h3>
          <div className="space-y-2">
            {past.slice(0, 50).map((e) => (
              <EventRow key={e.id} event={e} onRefresh={fetchData} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-slate-800",
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

function EventRow({
  event,
  onRefresh,
}: {
  event: CalendarEvent;
  onRefresh: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);

  async function handleStatusChange(newStatus: EventStatus) {
    await fetch(`/api/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await onRefresh();
  }

  async function handleDelete() {
    if (!confirm("このイベントを削除しますか？")) return;
    await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    await onRefresh();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          <div className="text-center shrink-0 bg-slate-50 rounded-lg px-3 py-1.5">
            <p className="text-[10px] text-slate-400">
              {new Date(event.date).toLocaleDateString("ja-JP", {
                weekday: "short",
              })}
            </p>
            <p className="text-sm font-bold text-slate-700">
              {new Date(event.date).toLocaleDateString("ja-JP", {
                month: "numeric",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TYPE_COLORS[event.eventType]}`}
              >
                {event.eventType}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[event.status]}`}
              >
                {event.status}
              </span>
              {event.startTime && (
                <span className="text-xs text-slate-500">
                  {event.startTime}
                  {event.endTime && ` - ${event.endTime}`}
                </span>
              )}
            </div>
            <p className="font-semibold text-slate-800 truncate mt-1">
              {event.title}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              {event.location && <span>📍 {event.location}</span>}
              {event.sellerName && (
                <span className="text-indigo-600">
                  売主: {event.sellerName}
                </span>
              )}
              {event.buyerCompanyName && (
                <span className="text-rose-600">
                  買手: {event.buyerCompanyName}
                </span>
              )}
              {event.attendees.length > 0 && (
                <span>👥 {event.attendees.join(", ")}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={event.status}
            onChange={(e) => handleStatusChange(e.target.value as EventStatus)}
            className="text-xs px-2 py-1 rounded border border-slate-200 bg-white"
          >
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
          >
            {expanded ? "閉じる" : "詳細"}
          </button>
          <button
            onClick={handleDelete}
            className="text-xs px-2 py-1 text-rose-500 hover:bg-rose-50 rounded"
          >
            削除
          </button>
        </div>
      </div>
      {expanded && event.description && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-medium mb-1">説明</p>
          <p className="text-xs text-slate-700 whitespace-pre-wrap">
            {event.description}
          </p>
        </div>
      )}
    </div>
  );
}

function EventForm({
  sellers,
  onClose,
  onSaved,
}: {
  sellers: SellerLite[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: "",
    eventType: "面談" as EventType,
    date: formatDate(new Date()),
    startTime: "",
    endTime: "",
    location: "",
    sellerId: "",
    attendees: "",
    description: "",
    status: "予定" as EventStatus,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          eventType: form.eventType,
          date: form.date,
          startTime: form.startTime || undefined,
          endTime: form.endTime || undefined,
          location: form.location.trim() || undefined,
          sellerId: form.sellerId || undefined,
          attendees: form.attendees
            ? form.attendees
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          description: form.description.trim() || undefined,
          status: form.status,
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
      <h3 className="font-semibold text-slate-800">新規イベント</h3>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          タイトル *
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          required
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            種別
          </label>
          <select
            value={form.eventType}
            onChange={(e) =>
              setForm({ ...form, eventType: e.target.value as EventType })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
            開始時刻
          </label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            終了時刻
          </label>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            場所
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            関連売主
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
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          参加者 (カンマ区切り)
        </label>
        <input
          type="text"
          value={form.attendees}
          onChange={(e) => setForm({ ...form, attendees: e.target.value })}
          placeholder="田中, 山田, 鈴木"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          説明
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
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
