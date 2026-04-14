import EmployeeManager from "@/components/EmployeeManager";
import ProjectManager from "@/components/ProjectManager";
import MinutesManager from "@/components/MinutesManager";
import TimeEntryManager from "@/components/TimeEntryManager";
import ActivityLog from "@/components/ActivityLog";
import SettingsTabs from "@/components/SettingsTabs";
import { findRecentAudit } from "@/lib/audit";

const TABS = [
  { id: "employees", label: "社員管理" },
  { id: "projects", label: "プロジェクト" },
  { id: "minutes", label: "議事録" },
  { id: "time", label: "工数" },
  { id: "activity", label: "活動ログ" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const active: TabId = TABS.some((t) => t.id === sp.tab)
    ? (sp.tab as TabId)
    : "employees";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">設定</h2>
        <p className="text-sm text-slate-500 mt-1">
          社員管理・プロジェクト・議事録・工数・活動ログを管理します
        </p>
      </div>

      <SettingsTabs tabs={TABS} active={active} />

      {active === "employees" && <EmployeeManager />}
      {active === "projects" && <ProjectManager />}
      {active === "minutes" && <MinutesManager />}
      {active === "time" && <TimeEntryManager />}
      {active === "activity" && (
        <ActivityLog entries={await findRecentAudit(100)} />
      )}
    </div>
  );
}
