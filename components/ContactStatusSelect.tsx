import {
  ALLIANCE_CONTACT_STATUSES,
  CONTACT_STATUS_LABELS,
  type AllianceContactStatus,
} from "@/lib/alliance-contact-status";

interface ContactStatusSelectProps {
  current?: string;
  name?: string;
}

export default function ContactStatusSelect({
  current,
  name = "contactStatus",
}: ContactStatusSelectProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-500">接点状況</label>
      <select
        name={name}
        defaultValue={current || ""}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="">すべて</option>
        {ALLIANCE_CONTACT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {CONTACT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ContactStatusBadge({
  status,
}: {
  status: AllianceContactStatus;
}) {
  const colors: Record<AllianceContactStatus, string> = {
    none: "bg-slate-100 text-slate-500",
    contacted: "bg-blue-100 text-blue-700",
    in_discussion: "bg-amber-100 text-amber-700",
    partnered: "bg-emerald-100 text-emerald-700",
    declined: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${colors[status]}`}
    >
      {CONTACT_STATUS_LABELS[status]}
    </span>
  );
}
