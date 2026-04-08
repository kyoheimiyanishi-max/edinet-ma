"use client";

import { useState, useEffect, useCallback } from "react";

interface RelatedCompany {
  companyCode: string;
  companyName: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  relatedCompanies: RelatedCompany[];
  assignedEmployeeIds: string[];
  sellerId?: string;
  startDate: string;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
}

interface SellerSummary {
  id: string;
  companyName: string;
  industry?: string;
  stage: string;
}

const PROJECT_STATUSES = [
  "企画中",
  "調査中",
  "交渉中",
  "DD実施中",
  "契約締結",
  "完了",
  "中止",
];

const PROJECT_PRIORITIES = ["高", "中", "低"];

const COMPANY_ROLES = ["買収対象", "売却対象", "アドバイザー", "その他"];

const STATUS_COLORS: Record<string, string> = {
  企画中: "bg-slate-100 text-slate-600",
  調査中: "bg-blue-100 text-blue-700",
  交渉中: "bg-amber-100 text-amber-700",
  DD実施中: "bg-purple-100 text-purple-700",
  契約締結: "bg-emerald-100 text-emerald-700",
  完了: "bg-green-100 text-green-700",
  中止: "bg-red-100 text-red-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  高: "bg-red-100 text-red-700",
  中: "bg-amber-100 text-amber-700",
  低: "bg-slate-100 text-slate-500",
};

const EMPTY_FORM = {
  name: "",
  description: "",
  status: "企画中",
  priority: "中",
  sellerId: "",
  startDate: "",
  targetDate: "",
};

const EMPTY_COMPANY = {
  companyCode: "",
  companyName: "",
  role: "買収対象",
};

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formCompanies, setFormCompanies] = useState<RelatedCompany[]>([]);
  const [formEmployeeIds, setFormEmployeeIds] = useState<string[]>([]);
  const [newCompany, setNewCompany] = useState(EMPTY_COMPANY);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/projects");
    setProjects(await res.json());
    setLoading(false);
  }, []);

  const fetchEmployees = useCallback(async () => {
    const res = await fetch("/api/employees");
    setEmployees(await res.json());
  }, []);

  const fetchSellers = useCallback(async () => {
    const res = await fetch("/api/sellers");
    setSellers(await res.json());
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
    fetchSellers();
  }, [fetchProjects, fetchEmployees, fetchSellers]);

  const sellerById = new Map(sellers.map((s) => [s.id, s] as const));

  const filtered = search
    ? projects.filter(
        (p) =>
          p.name.includes(search) ||
          p.description.includes(search) ||
          p.status.includes(search),
      )
    : projects;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const body = {
      ...form,
      sellerId: form.sellerId || undefined,
      relatedCompanies: formCompanies,
      assignedEmployeeIds: formEmployeeIds,
    };

    if (editingId) {
      await fetch(`/api/projects/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormCompanies([]);
    setFormEmployeeIds([]);
    fetchProjects();
  }

  async function handleDelete(id: string) {
    if (!confirm("このプロジェクトを削除しますか？")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  }

  function startEdit(p: Project) {
    setForm({
      name: p.name,
      description: p.description,
      status: p.status,
      priority: p.priority,
      sellerId: p.sellerId ?? "",
      startDate: p.startDate,
      targetDate: p.targetDate,
    });
    setFormCompanies(p.relatedCompanies);
    setFormEmployeeIds(p.assignedEmployeeIds);
    setEditingId(p.id);
    setShowForm(true);
  }

  function addCompany() {
    if (!newCompany.companyName.trim()) return;
    setFormCompanies([...formCompanies, { ...newCompany }]);
    setNewCompany(EMPTY_COMPANY);
  }

  function toggleEmployee(id: string) {
    setFormEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((eid) => eid !== id) : [...prev, id],
    );
  }

  const activeCount = projects.filter(
    (p) => !["完了", "中止"].includes(p.status),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">プロジェクト管理</h2>
        <p className="text-sm text-slate-500 mt-1">
          M&A案件のプロジェクトを管理します
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">総プロジェクト</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {projects.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">進行中</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">完了</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {projects.filter((p) => p.status === "完了").length}
          </p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="プロジェクト名・ステータスで検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setEditingId(null);
              setFormCompanies([]);
              setFormEmployeeIds([]);
              setShowForm(true);
            }}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0"
          >
            + 新規プロジェクト
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">
              {editingId ? "プロジェクトを編集" : "新規プロジェクト作成"}
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
                  プロジェクト名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: A社買収案件"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  概要
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="プロジェクトの概要"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  ステータス
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  優先度
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PROJECT_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  目標完了日
                </label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) =>
                    setForm({ ...form, targetDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Linked Seller */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                紐付け売主
              </label>
              <select
                value={form.sellerId}
                onChange={(e) => setForm({ ...form, sellerId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">（紐付けなし）</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName}
                    {s.industry ? ` / ${s.industry}` : ""} — {s.stage}
                  </option>
                ))}
              </select>
              {sellers.length === 0 && (
                <p className="text-[10px] text-slate-400 mt-1">
                  売主管理タブで売主を登録すると紐付けできます
                </p>
              )}
            </div>

            {/* Related Companies */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                関連企業
              </label>
              {formCompanies.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {formCompanies.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <span>
                        {c.companyName}{" "}
                        <span className="text-slate-400 text-xs">
                          ({c.role})
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormCompanies(
                            formCompanies.filter((_, j) => j !== i),
                          )
                        }
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCompany.companyCode}
                  onChange={(e) =>
                    setNewCompany({
                      ...newCompany,
                      companyCode: e.target.value,
                    })
                  }
                  placeholder="EDINETコード"
                  className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newCompany.companyName}
                  onChange={(e) =>
                    setNewCompany({
                      ...newCompany,
                      companyName: e.target.value,
                    })
                  }
                  placeholder="企業名"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newCompany.role}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, role: e.target.value })
                  }
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COMPANY_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addCompany}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  追加
                </button>
              </div>
            </div>

            {/* Assigned Employees */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">
                担当者
              </label>
              {employees.length === 0 ? (
                <p className="text-xs text-slate-400">
                  社員が登録されていません
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {employees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleEmployee(emp.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        formEmployeeIds.includes(emp.id)
                          ? "bg-blue-50 border-blue-300 text-blue-700"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {emp.name}
                      {emp.department && (
                        <span className="text-slate-400 ml-1">
                          ({emp.department})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
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

      {/* Project List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          {projects.length === 0
            ? "プロジェクトが登録されていません。「+ 新規プロジェクト」から始めましょう。"
            : "検索条件に該当するプロジェクトが見つかりませんでした"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const assignedEmps = employees.filter((e) =>
              p.assignedEmployeeIds.includes(e.id),
            );
            const linkedSeller = p.sellerId
              ? sellerById.get(p.sellerId)
              : undefined;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() =>
                        setExpandedId(expandedId === p.id ? null : p.id)
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {p.status}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[p.priority] ?? "bg-slate-100 text-slate-500"}`}
                        >
                          {p.priority}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {p.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {linkedSeller && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                            売主: {linkedSeller.companyName}
                          </span>
                        )}
                        {p.startDate && (
                          <span className="text-[10px] text-slate-400">
                            開始: {p.startDate}
                          </span>
                        )}
                        {p.targetDate && (
                          <span className="text-[10px] text-slate-400">
                            目標: {p.targetDate}
                          </span>
                        )}
                        {assignedEmps.length > 0 && (
                          <span className="text-[10px] text-blue-500">
                            担当: {assignedEmps.map((e) => e.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        削除
                      </button>
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === p.id ? null : p.id)
                        }
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedId === p.id ? "rotate-180" : ""}`}
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

                {expandedId === p.id && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                    {linkedSeller && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-2">
                          紐付け売主
                        </h4>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-indigo-200 px-3 py-2">
                          <span className="text-sm font-semibold text-indigo-700">
                            {linkedSeller.companyName}
                          </span>
                          {linkedSeller.industry && (
                            <span className="text-[10px] text-slate-500">
                              {linkedSeller.industry}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 ml-auto">
                            {linkedSeller.stage}
                          </span>
                        </div>
                      </div>
                    )}
                    {p.relatedCompanies.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-2">
                          関連企業
                        </h4>
                        <div className="space-y-1.5">
                          {p.relatedCompanies.map((c, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2"
                            >
                              <a
                                href={`/company/${c.companyCode}`}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {c.companyName}
                              </a>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {c.companyCode}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                {c.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {assignedEmps.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-2">
                          担当者
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {assignedEmps.map((e) => (
                            <span
                              key={e.id}
                              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                            >
                              {e.name}
                              {e.department && (
                                <span className="text-slate-400 ml-1">
                                  ({e.department})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400">
                      作成: {new Date(p.createdAt).toLocaleDateString("ja-JP")}{" "}
                      / 更新:{" "}
                      {new Date(p.updatedAt).toLocaleDateString("ja-JP")}
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
