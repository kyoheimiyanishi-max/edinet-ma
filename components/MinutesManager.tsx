"use client";

import { useState, useEffect, useCallback } from "react";

interface ActionItem {
  task: string;
  assignee: string;
  deadline: string;
  status: string;
}

interface MeetingMinute {
  id: string;
  title: string;
  date: string;
  participants: string[];
  projectId: string;
  projectName: string;
  content: string;
  decisions: string[];
  actionItems: ActionItem[];
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
}

const ACTION_STATUSES = ["未着手", "進行中", "完了"];

const ACTION_STATUS_COLORS: Record<string, string> = {
  未着手: "bg-slate-100 text-slate-600",
  進行中: "bg-blue-100 text-blue-700",
  完了: "bg-green-100 text-green-700",
};

const EMPTY_FORM = {
  title: "",
  date: new Date().toISOString().split("T")[0],
  participantsText: "",
  projectId: "",
  projectName: "",
  content: "",
  decisionsText: "",
};

const EMPTY_ACTION: ActionItem = {
  task: "",
  assignee: "",
  deadline: "",
  status: "未着手",
};

export default function MinutesManager() {
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formActions, setFormActions] = useState<ActionItem[]>([]);
  const [newAction, setNewAction] = useState(EMPTY_ACTION);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMinutes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/minutes");
    setMinutes(await res.json());
    setLoading(false);
  }, []);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
  }, []);

  // TODO(serverComponent): move initial fetch to a parent Server
  // Component and pass data via props. The current effect is safe
  // (only runs once on mount) but triggers the Next.js 16 lint rule.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchMinutes();
    fetchProjects();
  }, [fetchMinutes, fetchProjects]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = search
    ? minutes.filter(
        (m) =>
          m.title.includes(search) ||
          m.content.includes(search) ||
          m.projectName.includes(search) ||
          m.participants.some((p) => p.includes(search)),
      )
    : minutes;

  // Sort by date descending
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    const selectedProject = projects.find((p) => p.id === form.projectId);

    const body = {
      title: form.title,
      date: form.date,
      participants: form.participantsText
        .split(/[,、\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
      projectId: form.projectId,
      projectName: selectedProject?.name ?? form.projectName,
      content: form.content,
      decisions: form.decisionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      actionItems: formActions,
    };

    if (editingId) {
      await fetch(`/api/minutes/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormActions([]);
    fetchMinutes();
  }

  async function handleDelete(id: string) {
    if (!confirm("この議事録を削除しますか？")) return;
    await fetch(`/api/minutes/${id}`, { method: "DELETE" });
    fetchMinutes();
  }

  function startEdit(m: MeetingMinute) {
    setForm({
      title: m.title,
      date: m.date,
      participantsText: m.participants.join(", "),
      projectId: m.projectId,
      projectName: m.projectName,
      content: m.content,
      decisionsText: m.decisions.join("\n"),
    });
    setFormActions(m.actionItems);
    setEditingId(m.id);
    setShowForm(true);
  }

  function addAction() {
    if (!newAction.task.trim()) return;
    setFormActions([...formActions, { ...newAction }]);
    setNewAction(EMPTY_ACTION);
  }

  const totalActions = minutes.reduce((s, m) => s + m.actionItems.length, 0);
  const pendingActions = minutes.reduce(
    (s, m) => s + m.actionItems.filter((a) => a.status !== "完了").length,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">議事録管理</h2>
        <p className="text-sm text-slate-500 mt-1">
          会議の議事録を記録し、AIが内容を分析・ステータス反映します
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">総議事録数</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {minutes.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">アクション総数</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {totalActions}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">未完了アクション</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            {pendingActions}
          </p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="タイトル・内容・参加者で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setEditingId(null);
              setFormActions([]);
              setShowForm(true);
            }}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0"
          >
            + 新規議事録
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">
              {editingId ? "議事録を編集" : "新規議事録作成"}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="text-slate-400 hover:text-slate-600 text-xl"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  タイトル <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: A社案件 第3回定例会議"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  日付
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  関連プロジェクト
                </label>
                <select
                  value={form.projectId}
                  onChange={(e) =>
                    setForm({ ...form, projectId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">なし</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  参加者（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={form.participantsText}
                  onChange={(e) =>
                    setForm({ ...form, participantsText: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 田中太郎, 山田花子, 鈴木一郎"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  議事内容
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="会議の内容を記録..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  決定事項（1行1件）
                </label>
                <textarea
                  value={form.decisionsText}
                  onChange={(e) =>
                    setForm({ ...form, decisionsText: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="A社へのLOI提出を承認&#10;DD開始日を4月15日に決定"
                />
              </div>
            </div>

            {/* Action Items */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                アクションアイテム
              </label>
              {formActions.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {formActions.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${ACTION_STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {a.status}
                        </span>
                        <span className="truncate">{a.task}</span>
                        {a.assignee && (
                          <span className="text-xs text-slate-400 shrink-0">
                            @{a.assignee}
                          </span>
                        )}
                        {a.deadline && (
                          <span className="text-xs text-slate-400 shrink-0">
                            〆{a.deadline}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormActions(formActions.filter((_, j) => j !== i))
                        }
                        className="text-xs text-red-400 hover:text-red-600 shrink-0 ml-2"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={newAction.task}
                  onChange={(e) =>
                    setNewAction({ ...newAction, task: e.target.value })
                  }
                  placeholder="タスク内容"
                  className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newAction.assignee}
                  onChange={(e) =>
                    setNewAction({ ...newAction, assignee: e.target.value })
                  }
                  placeholder="担当者"
                  className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={newAction.deadline}
                  onChange={(e) =>
                    setNewAction({ ...newAction, deadline: e.target.value })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newAction.status}
                  onChange={(e) =>
                    setNewAction({ ...newAction, status: e.target.value })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ACTION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addAction}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  追加
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                {editingId ? "更新" : "作成"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Minutes List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">読み込み中...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          {minutes.length === 0
            ? "議事録が登録されていません。「+ 新規議事録」から始めましょう。"
            : "検索条件に該当する議事録が見つかりませんでした"}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((m) => {
            const pendingCount = m.actionItems.filter(
              (a) => a.status !== "完了",
            ).length;
            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === m.id ? null : m.id)
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <p className="font-semibold text-slate-800">
                          {m.title}
                        </p>
                        {m.projectName && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                            {m.projectName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-slate-400">{m.date}</span>
                        {m.participants.length > 0 && (
                          <span className="text-xs text-slate-400">
                            参加: {m.participants.join(", ")}
                          </span>
                        )}
                        {m.actionItems.length > 0 && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              pendingCount > 0
                                ? "bg-amber-50 text-amber-600"
                                : "bg-green-50 text-green-600"
                            }`}
                          >
                            {pendingCount > 0
                              ? `${pendingCount}件未完了`
                              : "全完了"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(m)}
                        className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        削除
                      </button>
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === m.id ? null : m.id)
                        }
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedId === m.id ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {expandedId === m.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                    {/* Content */}
                    {m.content && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-1.5">
                          議事内容
                        </h4>
                        <div className="bg-white rounded-lg border border-slate-200 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                          {m.content}
                        </div>
                      </div>
                    )}

                    {/* Decisions */}
                    {m.decisions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-1.5">
                          決定事項
                        </h4>
                        <div className="space-y-1">
                          {m.decisions.map((d, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                              <span className="text-emerald-500 shrink-0 mt-0.5">
                                ✓
                              </span>
                              <span>{d}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Items */}
                    {m.actionItems.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-1.5">
                          アクションアイテム
                        </h4>
                        <div className="space-y-1">
                          {m.actionItems.map((a, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            >
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${ACTION_STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}
                              >
                                {a.status}
                              </span>
                              <span className="flex-1">{a.task}</span>
                              {a.assignee && (
                                <span className="text-xs text-blue-500 shrink-0">
                                  @{a.assignee}
                                </span>
                              )}
                              {a.deadline && (
                                <span className="text-xs text-slate-400 shrink-0">
                                  〆{a.deadline}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400">
                      作成: {new Date(m.createdAt).toLocaleDateString("ja-JP")}{" "}
                      / 更新:{" "}
                      {new Date(m.updatedAt).toLocaleDateString("ja-JP")}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
