"use client";

import { useState } from "react";
import EmployeeManager from "@/components/EmployeeManager";
import ProjectManager from "@/components/ProjectManager";
import MinutesManager from "@/components/MinutesManager";

const TABS = [
  { id: "employees", label: "社員管理" },
  { id: "projects", label: "プロジェクト" },
  { id: "minutes", label: "議事録" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("employees");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">設定</h2>
        <p className="text-sm text-slate-500 mt-1">
          社員管理・プロジェクト・議事録を管理します
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "employees" && <EmployeeManager />}
      {activeTab === "projects" && <ProjectManager />}
      {activeTab === "minutes" && <MinutesManager />}
    </div>
  );
}
