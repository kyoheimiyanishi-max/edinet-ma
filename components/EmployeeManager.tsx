"use client";

import { useState, useEffect, useCallback } from "react";

// ---- Types (mirrors lib/employees.ts) ----

interface CompanyAssignment {
  companyCode: string;
  companyName: string;
  role: string;
  status: string;
  note: string;
  assignedAt: string;
}

interface KPI {
  id: string;
  period: string;
  metric: string;
  target: number;
  actual: number;
  unit: string;
  note: string;
  updatedAt: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  phone: string;
  createdAt: string;
  assignments: CompanyAssignment[];
  kpis: KPI[];
}

const DEPARTMENTS = [
  "M&Aアドバイザリー部",
  "法人営業部",
  "事業開発部",
  "経営企画部",
  "財務部",
  "法務部",
  "その他",
];

const POSITIONS = [
  "代表取締役",
  "取締役",
  "執行役員",
  "部長",
  "次長",
  "課長",
  "主任",
  "担当",
];

const ASSIGNMENT_ROLES = ["主担当", "副担当", "サポート"];
const ASSIGNMENT_STATUSES = ["アクティブ", "フォロー中", "完了"];

const KPI_PRESETS: ReadonlyArray<{ metric: string; unit: string }> = [
  { metric: "新規開拓数", unit: "件" },
  { metric: "面談数", unit: "件" },
  { metric: "提案数", unit: "件" },
  { metric: "受託件数", unit: "件" },
  { metric: "成約件数", unit: "件" },
  { metric: "受託金額", unit: "円" },
  { metric: "売上金額", unit: "円" },
  { metric: "担当企業数", unit: "社" },
];

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatKpiValue(value: number, unit: string): string {
  if (unit === "円") return `¥${value.toLocaleString()}`;
  return `${value.toLocaleString()}${unit}`;
}

function kpiProgress(k: KPI): number {
  if (!k.target) return 0;
  return Math.min(999, Math.round((k.actual / k.target) * 100));
}

const ROLE_COLORS: Record<string, string> = {
  主担当: "bg-blue-100 text-blue-700",
  副担当: "bg-emerald-100 text-emerald-700",
  サポート: "bg-slate-100 text-slate-600",
};

const STATUS_COLORS: Record<string, string> = {
  アクティブ: "bg-green-100 text-green-700",
  フォロー中: "bg-amber-100 text-amber-700",
  完了: "bg-slate-100 text-slate-500",
};

// ---- Empty form state ----

const EMPTY_FORM = {
  name: "",
  email: "",
  department: "",
  position: "",
  phone: "",
};

const EMPTY_ASSIGN = {
  companyCode: "",
  companyName: "",
  role: "主担当",
  status: "アクティブ",
  note: "",
};

const EMPTY_KPI = {
  period: "",
  metric: "",
  target: "",
  actual: "",
  unit: "件",
  note: "",
};

export default function EmployeeManager() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Assignment state
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN);

  // KPI state
  const [kpiEmployeeId, setKpiEmployeeId] = useState<string | null>(null);
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [kpiForm, setKpiForm] = useState(EMPTY_KPI);

  // Expanded employee
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/employees");
    const data = await res.json();
    setEmployees(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ---- Filtered list ----

  const filtered = search
    ? employees.filter(
        (e) =>
          e.name.includes(search) ||
          e.department.includes(search) ||
          e.position.includes(search) ||
          e.email.includes(search),
      )
    : employees;

  // ---- CRUD handlers ----

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      await fetch(`/api/employees/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    fetchEmployees();
  }

  async function handleDelete(id: string) {
    if (!confirm("この社員を削除しますか？")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    fetchEmployees();
  }

  function startEdit(emp: Employee) {
    setForm({
      name: emp.name,
      email: emp.email,
      department: emp.department,
      position: emp.position,
      phone: emp.phone,
    });
    setEditingId(emp.id);
    setShowForm(true);
  }

  // ---- Assignment handlers ----

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assigningId || !assignForm.companyCode.trim()) return;

    await fetch(`/api/employees/${assigningId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignForm),
    });

    setAssigningId(null);
    setAssignForm(EMPTY_ASSIGN);
    fetchEmployees();
  }

  async function handleRemoveAssignment(employeeId: string, code: string) {
    await fetch(
      `/api/employees/${employeeId}/assignments?companyCode=${encodeURIComponent(code)}`,
      { method: "DELETE" },
    );
    fetchEmployees();
  }

  // ---- KPI handlers ----

  function openNewKpi(employeeId: string) {
    setKpiEmployeeId(employeeId);
    setEditingKpiId(null);
    setKpiForm({ ...EMPTY_KPI, period: currentPeriod() });
  }

  function startEditKpi(employeeId: string, kpi: KPI) {
    setKpiEmployeeId(employeeId);
    setEditingKpiId(kpi.id);
    setKpiForm({
      period: kpi.period,
      metric: kpi.metric,
      target: String(kpi.target),
      actual: String(kpi.actual),
      unit: kpi.unit,
      note: kpi.note,
    });
  }

  function closeKpiForm() {
    setKpiEmployeeId(null);
    setEditingKpiId(null);
    setKpiForm(EMPTY_KPI);
  }

  async function handleSubmitKpi(e: React.FormEvent) {
    e.preventDefault();
    if (!kpiEmployeeId || !kpiForm.metric.trim() || !kpiForm.period.trim())
      return;

    const payload = {
      period: kpiForm.period,
      metric: kpiForm.metric,
      target: Number(kpiForm.target) || 0,
      actual: Number(kpiForm.actual) || 0,
      unit: kpiForm.unit,
      note: kpiForm.note,
    };

    if (editingKpiId) {
      await fetch(`/api/employees/${kpiEmployeeId}/kpis/${editingKpiId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/employees/${kpiEmployeeId}/kpis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    closeKpiForm();
    fetchEmployees();
  }

  async function handleDeleteKpi(employeeId: string, kpiId: string) {
    if (!confirm("このKPIを削除しますか？")) return;
    await fetch(`/api/employees/${employeeId}/kpis/${kpiId}`, {
      method: "DELETE",
    });
    fetchEmployees();
  }

  function applyKpiPreset(preset: { metric: string; unit: string }) {
    setKpiForm((f) => ({ ...f, metric: preset.metric, unit: preset.unit }));
  }

  // ---- Render ----

  const activeCount = employees.filter((e) =>
    e.assignments.some((a) => a.status === "アクティブ"),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">社員管理</h2>
        <p className="text-sm text-slate-500 mt-1">
          社員の登録・管理と、各企業への担当割り当てを行います
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">登録社員数</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {employees.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">担当中</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
          <p className="text-xs text-slate-400 font-medium">総担当企業数</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {employees.reduce((s, e) => s + e.assignments.length, 0)}
          </p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="名前・部署・役職で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setEditingId(null);
              setShowForm(true);
            }}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shrink-0"
          >
            + 新規登録
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">
              {editingId ? "社員情報を編集" : "新規社員登録"}
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
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  名前 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 田中太郎"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  メール
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="tanaka@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  部署
                </label>
                <select
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  役職
                </label>
                <select
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="03-1234-5678"
                />
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
                {editingId ? "更新" : "登録"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          {employees.length === 0
            ? "社員が登録されていません。「+ 新規登録」から始めましょう。"
            : "検索条件に該当する社員が見つかりませんでした"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
            >
              {/* Employee row */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === emp.id ? null : emp.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">
                          {emp.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {emp.department && (
                            <span className="text-xs text-slate-500">
                              {emp.department}
                            </span>
                          )}
                          {emp.department && emp.position && (
                            <span className="text-slate-300">·</span>
                          )}
                          {emp.position && (
                            <span className="text-xs text-slate-500">
                              {emp.position}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {emp.assignments.length > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">
                        {emp.assignments.length}社担当
                      </span>
                    )}
                    {emp.kpis.length > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                        KPI {emp.kpis.length}
                      </span>
                    )}
                    <button
                      onClick={() => startEdit(emp)}
                      className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      削除
                    </button>
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === emp.id ? null : emp.id)
                      }
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${expandedId === emp.id ? "rotate-180" : ""}`}
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

                {/* Contact info */}
                {(emp.email || emp.phone) && (
                  <div className="flex gap-4 mt-2 ml-13 pl-13">
                    {emp.email && (
                      <span className="text-xs text-slate-400">
                        ✉ {emp.email}
                      </span>
                    )}
                    {emp.phone && (
                      <span className="text-xs text-slate-400">
                        ☎ {emp.phone}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded: Assignments */}
              {expandedId === emp.id && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700">
                      担当企業
                    </h4>
                    <button
                      onClick={() => {
                        setAssigningId(emp.id);
                        setAssignForm(EMPTY_ASSIGN);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                    >
                      + 企業を割り当て
                    </button>
                  </div>

                  {/* Assignment form */}
                  {assigningId === emp.id && (
                    <form
                      onSubmit={handleAssign}
                      className="bg-white rounded-xl border border-blue-200 p-4 mb-3 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            EDINETコード <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={assignForm.companyCode}
                            onChange={(e) =>
                              setAssignForm({
                                ...assignForm,
                                companyCode: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="例: E03006"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            企業名 <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={assignForm.companyName}
                            onChange={(e) =>
                              setAssignForm({
                                ...assignForm,
                                companyName: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="例: あいホールディングス株式会社"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            担当区分
                          </label>
                          <select
                            value={assignForm.role}
                            onChange={(e) =>
                              setAssignForm({
                                ...assignForm,
                                role: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {ASSIGNMENT_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">
                            ステータス
                          </label>
                          <select
                            value={assignForm.status}
                            onChange={(e) =>
                              setAssignForm({
                                ...assignForm,
                                status: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {ASSIGNMENT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          メモ
                        </label>
                        <input
                          type="text"
                          value={assignForm.note}
                          onChange={(e) =>
                            setAssignForm({
                              ...assignForm,
                              note: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="自由メモ"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAssigningId(null)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                        >
                          キャンセル
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          割り当て
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Assignment list */}
                  {emp.assignments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">
                      担当企業が割り当てられていません
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {emp.assignments.map((a) => (
                        <div
                          key={a.companyCode}
                          className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <a
                                href={`/company/${a.companyCode}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors truncate"
                              >
                                {a.companyName}
                              </a>
                              <span className="text-[10px] font-mono text-slate-400">
                                {a.companyCode}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[a.role] ?? "bg-slate-100 text-slate-600"}`}
                              >
                                {a.role}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-500"}`}
                              >
                                {a.status}
                              </span>
                              {a.note && (
                                <span className="text-[10px] text-slate-400 truncate">
                                  {a.note}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveAssignment(emp.id, a.companyCode)
                            }
                            className="text-xs text-slate-400 hover:text-red-500 transition-colors shrink-0 px-2 py-1"
                          >
                            解除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* KPI section */}
                  <div className="mt-6 pt-5 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-slate-700">
                        KPI
                      </h4>
                      <button
                        onClick={() => openNewKpi(emp.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
                      >
                        + KPIを追加
                      </button>
                    </div>

                    {/* KPI form */}
                    {kpiEmployeeId === emp.id && (
                      <form
                        onSubmit={handleSubmitKpi}
                        className="bg-white rounded-xl border border-indigo-200 p-4 mb-3 space-y-3"
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {KPI_PRESETS.map((p) => (
                            <button
                              key={p.metric}
                              type="button"
                              onClick={() => applyKpiPreset(p)}
                              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                                kpiForm.metric === p.metric
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {p.metric}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              期間 <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="month"
                              required
                              value={kpiForm.period}
                              onChange={(e) =>
                                setKpiForm({
                                  ...kpiForm,
                                  period: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              指標 <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={kpiForm.metric}
                              onChange={(e) =>
                                setKpiForm({
                                  ...kpiForm,
                                  metric: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="例: 新規開拓数"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              目標
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={kpiForm.target}
                              onChange={(e) =>
                                setKpiForm({
                                  ...kpiForm,
                                  target: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              実績
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={kpiForm.actual}
                              onChange={(e) =>
                                setKpiForm({
                                  ...kpiForm,
                                  actual: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              単位
                            </label>
                            <input
                              type="text"
                              value={kpiForm.unit}
                              onChange={(e) =>
                                setKpiForm({
                                  ...kpiForm,
                                  unit: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="件 / 円 / 社"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-3">
                            <label className="block text-xs font-medium text-slate-500 mb-1">
                              メモ
                            </label>
                            <input
                              type="text"
                              value={kpiForm.note}
                              onChange={(e) =>
                                setKpiForm({
                                  ...kpiForm,
                                  note: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="補足・進捗コメント"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={closeKpiForm}
                            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                          >
                            キャンセル
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            {editingKpiId ? "更新" : "追加"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* KPI list */}
                    {emp.kpis.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">
                        KPIが登録されていません
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {[...emp.kpis]
                          .sort((a, b) =>
                            a.period === b.period
                              ? a.metric.localeCompare(b.metric)
                              : b.period.localeCompare(a.period),
                          )
                          .map((k) => {
                            const progress = kpiProgress(k);
                            const barColor =
                              progress >= 100
                                ? "bg-emerald-500"
                                : progress >= 70
                                  ? "bg-blue-500"
                                  : progress >= 40
                                    ? "bg-amber-500"
                                    : "bg-rose-500";
                            return (
                              <div
                                key={k.id}
                                className="bg-white rounded-xl border border-slate-200 p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {k.period}
                                      </span>
                                      <span className="text-sm font-semibold text-slate-800">
                                        {k.metric}
                                      </span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 mt-1">
                                      <span className="text-sm font-bold text-slate-800">
                                        {formatKpiValue(k.actual, k.unit)}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        / {formatKpiValue(k.target, k.unit)}
                                      </span>
                                      <span
                                        className={`text-[10px] font-medium ml-1 ${
                                          progress >= 100
                                            ? "text-emerald-600"
                                            : progress >= 70
                                              ? "text-blue-600"
                                              : progress >= 40
                                                ? "text-amber-600"
                                                : "text-rose-600"
                                        }`}
                                      >
                                        {progress}%
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                      <div
                                        className={`h-full ${barColor} transition-all`}
                                        style={{
                                          width: `${Math.min(100, progress)}%`,
                                        }}
                                      />
                                    </div>
                                    {k.note && (
                                      <p className="text-[10px] text-slate-400 mt-1.5">
                                        {k.note}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => startEditKpi(emp.id, k)}
                                      className="text-xs text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1"
                                    >
                                      編集
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteKpi(emp.id, k.id)
                                      }
                                      className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1"
                                    >
                                      削除
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
