"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type OutreachChannel = "email" | "mail" | "phone" | "form" | "meeting";
type OutreachStatus =
  | "sent"
  | "delivered"
  | "opened"
  | "replied"
  | "bounced"
  | "failed";

const CHANNELS: OutreachChannel[] = [
  "email",
  "mail",
  "phone",
  "form",
  "meeting",
];
const STATUSES: OutreachStatus[] = [
  "sent",
  "delivered",
  "opened",
  "replied",
  "bounced",
  "failed",
];

const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: "Email",
  mail: "郵送",
  phone: "電話",
  form: "フォーム",
  meeting: "面談",
};
const STATUS_LABELS: Record<OutreachStatus, string> = {
  sent: "送付済",
  delivered: "着信",
  opened: "開封",
  replied: "返信あり",
  bounced: "エラー",
  failed: "失敗",
};
const STATUS_COLORS: Record<OutreachStatus, string> = {
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-indigo-100 text-indigo-700",
  opened: "bg-purple-100 text-purple-700",
  replied: "bg-emerald-100 text-emerald-700",
  bounced: "bg-rose-100 text-rose-700",
  failed: "bg-slate-100 text-slate-600",
};

interface Template {
  id: string;
  name: string;
  channel: OutreachChannel;
  subject?: string;
  body: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Log {
  id: string;
  buyerCompanyId?: string;
  buyerCompanyName?: string;
  sellerId?: string;
  sellerName?: string;
  templateId?: string;
  templateName?: string;
  channel: OutreachChannel;
  subject?: string;
  body?: string;
  sentAt: string;
  sentBy?: string;
  status: OutreachStatus;
  replyText?: string;
  notes?: string;
  createdAt: string;
}

interface BuyerLite {
  id: string;
  name: string;
}

interface SellerLite {
  id: string;
  companyName: string;
}

export default function OutreachManager() {
  const [tab, setTab] = useState<"logs" | "templates">("logs");
  const [logs, setLogs] = useState<Log[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [buyers, setBuyers] = useState<BuyerLite[]>([]);
  const [sellers, setSellers] = useState<SellerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewLog, setShowNewLog] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [filter, setFilter] = useState<{
    status: OutreachStatus | "";
    channel: OutreachChannel | "";
    search: string;
  }>({ status: "", channel: "", search: "" });

  const fetchAll = useCallback(async () => {
    const [lRes, tRes, bRes, sRes] = await Promise.all([
      fetch("/api/outreach/logs"),
      fetch("/api/outreach/templates"),
      fetch("/api/buyers/list").catch(() => ({ json: async () => [] })),
      fetch("/api/sellers"),
    ]);
    setLogs(await lRes.json());
    setTemplates(await tRes.json());
    try {
      setBuyers(await (bRes as Response).json());
    } catch {
      setBuyers([]);
    }
    setSellers(await sRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filter.status && l.status !== filter.status) return false;
      if (filter.channel && l.channel !== filter.channel) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const hay = [
          l.buyerCompanyName,
          l.sellerName,
          l.subject,
          l.body,
          l.sentBy,
          l.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filter]);

  const now = useMemo(() => Date.now(), []);
  const stats = useMemo(() => {
    const total = logs.length;
    const replied = logs.filter((l) => l.status === "replied").length;
    const sent7d = logs.filter((l) => {
      const d = new Date(l.sentAt);
      return now - d.getTime() < 7 * 24 * 3600 * 1000;
    }).length;
    return { total, replied, sent7d };
  }, [logs, now]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">送付管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            買い手候補企業へのアプローチ履歴とメール/文面テンプレートを一元管理
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="総送付数" value={stats.total} />
        <StatCard
          label="過去 7 日"
          value={stats.sent7d}
          color="text-blue-700"
        />
        <StatCard
          label="返信あり"
          value={stats.replied}
          color="text-emerald-700"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {(
            [
              ["logs", `送付履歴 (${logs.length})`],
              ["templates", `テンプレート (${templates.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {tab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={filter.search}
                onChange={(e) =>
                  setFilter({ ...filter, search: e.target.value })
                }
                placeholder="会社名・件名で検索..."
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-64"
              />
              <select
                value={filter.channel}
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    channel: e.target.value as OutreachChannel | "",
                  })
                }
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="">チャネル 全て</option>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
              <select
                value={filter.status}
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    status: e.target.value as OutreachStatus | "",
                  })
                }
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
              >
                <option value="">状態 全て</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowNewLog(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
            >
              + 送付記録
            </button>
          </div>

          {showNewLog && (
            <LogForm
              buyers={buyers}
              sellers={sellers}
              templates={templates}
              onClose={() => setShowNewLog(false)}
              onSaved={async () => {
                setShowNewLog(false);
                await fetchAll();
              }}
            />
          )}

          {loading ? (
            <div className="text-slate-400 text-center py-10">
              読み込み中...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-slate-400 text-center py-10 bg-white rounded-2xl border border-slate-200/60">
              送付記録がありません
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((l) => (
                <LogRow
                  key={l.id}
                  log={l}
                  onUpdated={fetchAll}
                  onDeleted={fetchAll}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowNewTemplate(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
            >
              + 新規テンプレート
            </button>
          </div>
          {showNewTemplate && (
            <TemplateForm
              onClose={() => setShowNewTemplate(false)}
              onSaved={async () => {
                setShowNewTemplate(false);
                await fetchAll();
              }}
            />
          )}
          {loading ? (
            <div className="text-slate-400 text-center py-10">
              読み込み中...
            </div>
          ) : templates.length === 0 ? (
            <div className="text-slate-400 text-center py-10 bg-white rounded-2xl border border-slate-200/60">
              テンプレートがありません
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} onDeleted={fetchAll} />
              ))}
            </div>
          )}
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

function LogRow({
  log,
  onUpdated,
  onDeleted,
}: {
  log: Log;
  onUpdated: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);

  async function handleStatusChange(newStatus: OutreachStatus) {
    await fetch(`/api/outreach/logs/${log.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setEditingStatus(false);
    await onUpdated();
  }

  async function handleDelete() {
    if (!confirm("この送付記録を削除しますか？")) return;
    await fetch(`/api/outreach/logs/${log.id}`, { method: "DELETE" });
    await onDeleted();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                {CHANNEL_LABELS[log.channel]}
              </span>
              {editingStatus ? (
                <select
                  value={log.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as OutreachStatus)
                  }
                  onBlur={() => setEditingStatus(false)}
                  className="text-xs px-2 py-0.5 rounded border border-slate-200"
                  autoFocus
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  onClick={() => setEditingStatus(true)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[log.status]}`}
                >
                  {STATUS_LABELS[log.status]}
                </button>
              )}
              <span className="text-xs text-slate-400">
                {new Date(log.sentAt).toLocaleString("ja-JP", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              {log.sentBy && (
                <span className="text-xs text-slate-500">by {log.sentBy}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-1.5">
              {log.buyerCompanyName ?? "(買い手未指定)"}
              {log.sellerName && (
                <span className="text-xs text-slate-400 font-normal ml-2">
                  → 対象: {log.sellerName}
                </span>
              )}
            </p>
            {log.subject && (
              <p className="text-xs text-slate-600 mt-1 truncate">
                件名: {log.subject}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
            {log.body && (
              <div>
                <p className="text-slate-400 font-medium mb-1">本文</p>
                <p className="text-slate-700 whitespace-pre-wrap">{log.body}</p>
              </div>
            )}
            {log.replyText && (
              <div>
                <p className="text-slate-400 font-medium mb-1">返信</p>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {log.replyText}
                </p>
              </div>
            )}
            {log.notes && (
              <div>
                <p className="text-slate-400 font-medium mb-1">メモ</p>
                <p className="text-slate-700 whitespace-pre-wrap">
                  {log.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LogForm({
  buyers,
  sellers,
  templates,
  onClose,
  onSaved,
}: {
  buyers: BuyerLite[];
  sellers: SellerLite[];
  templates: Template[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    buyerCompanyId: "",
    sellerId: "",
    templateId: "",
    channel: "email" as OutreachChannel,
    subject: "",
    body: "",
    sentBy: "",
    status: "sent" as OutreachStatus,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [buyerSearch, setBuyerSearch] = useState("");
  const [buyerSearchResults, setBuyerSearchResults] = useState<BuyerLite[]>([]);

  useEffect(() => {
    if (!buyerSearch.trim()) {
      setBuyerSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/buyers/list?q=${encodeURIComponent(buyerSearch.trim())}`,
      );
      if (res.ok) {
        setBuyerSearchResults(await res.json());
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [buyerSearch]);

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setForm({
      ...form,
      templateId: id,
      channel: t.channel,
      subject: t.subject ?? "",
      body: t.body,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/outreach/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerCompanyId: form.buyerCompanyId || undefined,
          sellerId: form.sellerId || undefined,
          templateId: form.templateId || undefined,
          channel: form.channel,
          subject: form.subject || undefined,
          body: form.body || undefined,
          sentBy: form.sentBy || undefined,
          status: form.status,
          notes: form.notes || undefined,
        }),
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  const selectedBuyer = buyers.find((b) => b.id === form.buyerCompanyId);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 space-y-3"
    >
      <h3 className="font-semibold text-slate-800">新規送付記録</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            買い手候補企業
          </label>
          {selectedBuyer ? (
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs flex-1 truncate">
                {selectedBuyer.name}
              </span>
              <button
                type="button"
                onClick={() => setForm({ ...form, buyerCompanyId: "" })}
                className="text-xs text-slate-500"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={buyerSearch}
                onChange={(e) => setBuyerSearch(e.target.value)}
                placeholder="会社名で検索..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              {buyerSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {buyerSearchResults.slice(0, 10).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setForm({ ...form, buyerCompanyId: b.id });
                        setBuyerSearch("");
                        setBuyerSearchResults([]);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 truncate"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            対象案件 (売主)
          </label>
          <select
            value={form.sellerId}
            onChange={(e) => setForm({ ...form, sellerId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            <option value="">(任意)</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            チャネル
          </label>
          <select
            value={form.channel}
            onChange={(e) =>
              setForm({ ...form, channel: e.target.value as OutreachChannel })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            状態
          </label>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as OutreachStatus })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            送付者
          </label>
          <input
            type="text"
            value={form.sentBy}
            onChange={(e) => setForm({ ...form, sentBy: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
        </div>
      </div>

      {templates.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            テンプレート適用
          </label>
          <select
            value={form.templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            <option value="">(なし)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                [{CHANNEL_LABELS[t.channel]}] {t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          件名
        </label>
        <input
          type="text"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          本文
        </label>
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={6}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          メモ
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
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

function TemplateCard({
  template,
  onDeleted,
}: {
  template: Template;
  onDeleted: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);

  async function handleDelete() {
    if (!confirm(`テンプレート「${template.name}」を削除しますか？`)) return;
    await fetch(`/api/outreach/templates/${template.id}`, {
      method: "DELETE",
    });
    await onDeleted();
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {CHANNEL_LABELS[template.channel]}
            </span>
            <p className="font-semibold text-slate-800 truncate">
              {template.name}
            </p>
          </div>
          {template.subject && (
            <p className="text-xs text-slate-500 mt-1">
              件名: {template.subject}
            </p>
          )}
          {template.description && (
            <p className="text-[10px] text-slate-400 mt-1">
              {template.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
          >
            {expanded ? "閉じる" : "内容"}
          </button>
          <button
            onClick={handleDelete}
            className="text-xs px-2 py-1 text-rose-500 hover:bg-rose-50 rounded"
          >
            削除
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
            {template.body}
          </pre>
        </div>
      )}
    </div>
  );
}

function TemplateForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    channel: "email" as OutreachChannel,
    subject: "",
    body: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/outreach/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          channel: form.channel,
          subject: form.subject.trim() || undefined,
          body: form.body,
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
      <h3 className="font-semibold text-slate-800">新規テンプレート</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            テンプレート名 *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            チャネル
          </label>
          <select
            value={form.channel}
            onChange={(e) =>
              setForm({ ...form, channel: e.target.value as OutreachChannel })
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          件名
        </label>
        <input
          type="text"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          本文 * (変数: {`{{companyName}}`}, {`{{sellerName}}`} 等)
        </label>
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={8}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
          required
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">
          説明
        </label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="どんな場面で使うか"
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
