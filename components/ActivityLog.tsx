import type { AuditEntry } from "@/lib/audit";

const ACTION_LABELS: Record<string, string> = {
  create: "作成",
  update: "更新",
  delete: "削除",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-rose-100 text-rose-700",
};

const ENTITY_LABELS: Record<string, string> = {
  seller: "売主",
  seller_minute: "記録",
  seller_task: "タスク",
  seller_document: "資料",
  seller_buyer: "買い手候補",
  event: "イベント",
  time_entry: "工数",
  outreach_log: "送付記録",
  outreach_template: "テンプレート",
  company_buyer: "買手プロスペクト",
};

export default function ActivityLog({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60">
        まだ活動ログがありません
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="divide-y divide-slate-100">
        {entries.map((e) => (
          <ActivityRow key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ entry: e }: { entry: AuditEntry }) {
  const actionLabel = ACTION_LABELS[e.action] ?? e.action;
  const actionColor = ACTION_COLORS[e.action] ?? "bg-slate-100 text-slate-600";
  const entityLabel = ENTITY_LABELS[e.entityType] ?? e.entityType;

  return (
    <div className="px-5 py-3 hover:bg-slate-50/50">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${actionColor}`}
          >
            {actionLabel}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800">
            <span className="font-semibold">{e.userName ?? e.userEmail}</span>
            <span className="text-slate-400 mx-1.5">が</span>
            <span className="font-medium text-slate-700">{entityLabel}</span>
            {e.entityLabel && (
              <span className="text-slate-500 ml-1">「{e.entityLabel}」</span>
            )}
            <span className="text-slate-400 ml-1.5">を{actionLabel}</span>
          </p>
          {e.changes && e.action === "update" && (
            <div className="mt-1.5 space-y-0.5">
              {Object.entries(
                e.changes as Record<string, { old: unknown; new: unknown }>,
              )
                .slice(0, 5)
                .map(([field, { old: oldVal, new: newVal }]) => (
                  <p key={field} className="text-[11px] text-slate-500">
                    <span className="text-slate-400">{field}:</span>{" "}
                    <span className="line-through text-slate-400">
                      {String(oldVal ?? "-").slice(0, 50)}
                    </span>
                    {" → "}
                    <span className="text-slate-700">
                      {String(newVal ?? "-").slice(0, 50)}
                    </span>
                  </p>
                ))}
            </div>
          )}
        </div>
        <div className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
          {new Date(e.createdAt).toLocaleString("ja-JP", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
