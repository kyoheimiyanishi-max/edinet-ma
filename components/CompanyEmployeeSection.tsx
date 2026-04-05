"use client";

import { useState, useEffect, useCallback } from "react";

interface CompanyAssignment {
  companyCode: string;
  companyName: string;
  role: string;
  status: string;
  note: string;
  assignedAt: string;
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
}

interface AssignedEmployee {
  employee: Employee;
  assignment: CompanyAssignment;
}

const ASSIGNMENT_ROLES = ["主担当", "副担当", "サポート"];
const ASSIGNMENT_STATUSES = ["アクティブ", "フォロー中", "完了"];

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

export default function CompanyEmployeeSection({
  companyCode,
  companyName,
}: {
  companyCode: string;
  companyName: string;
}) {
  const [assigned, setAssigned] = useState<AssignedEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [role, setRole] = useState("主担当");
  const [status, setStatus] = useState("アクティブ");
  const [note, setNote] = useState("");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/employees");
    const employees: Employee[] = await res.json();
    setAllEmployees(employees);

    const results: AssignedEmployee[] = [];
    for (const emp of employees) {
      const assignment = emp.assignments.find(
        (a) => a.companyCode === companyCode,
      );
      if (assignment) {
        results.push({ employee: emp, assignment });
      }
    }
    setAssigned(results);
  }, [companyCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const unassigned = allEmployees.filter(
    (e) => !assigned.some((a) => a.employee.id === e.id),
  );

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;

    await fetch(`/api/employees/${selectedId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyCode, companyName, role, status, note }),
    });

    setShowForm(false);
    setSelectedId("");
    setRole("主担当");
    setStatus("アクティブ");
    setNote("");
    fetchData();
  }

  async function handleRemove(employeeId: string) {
    await fetch(
      `/api/employees/${employeeId}/assignments?companyCode=${encodeURIComponent(companyCode)}`,
      { method: "DELETE" },
    );
    fetchData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div />
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
        >
          + 担当者を追加
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAssign}
          className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                社員を選択 <span className="text-red-400">*</span>
              </label>
              {unassigned.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  割り当て可能な社員がいません。
                  <a
                    href="/employees"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    社員管理
                  </a>
                  から登録してください。
                </p>
              ) : (
                <select
                  required
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  {unassigned.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                      {emp.department ? ` (${emp.department})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                担当区分
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
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
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ASSIGNMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                メモ
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="自由メモ"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!selectedId}
              className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              追加
            </button>
          </div>
        </form>
      )}

      {/* Assigned employees list */}
      {assigned.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">
          担当者が割り当てられていません
        </p>
      ) : (
        <div className="space-y-2">
          {assigned.map(({ employee: emp, assignment: a }) => (
            <div
              key={emp.id}
              className="flex items-center justify-between gap-3 bg-slate-50/80 rounded-xl border border-slate-100 p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {emp.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href="/employees"
                      className="text-sm font-medium text-slate-800 hover:text-blue-600 transition-colors"
                    >
                      {emp.name}
                    </a>
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
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {emp.department && (
                      <span className="text-[10px] text-slate-400">
                        {emp.department}
                      </span>
                    )}
                    {emp.position && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400">
                          {emp.position}
                        </span>
                      </>
                    )}
                    {a.note && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400">
                          {a.note}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(emp.id)}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors shrink-0 px-2 py-1"
              >
                解除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
