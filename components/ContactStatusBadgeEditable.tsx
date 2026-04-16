"use client";

import { useCallback, useState } from "react";
import {
  ALLIANCE_CONTACT_STATUSES,
  CONTACT_STATUS_LABELS,
  type AllianceContactStatus,
} from "@/lib/alliance-contact-status";

const COLORS: Record<AllianceContactStatus, string> = {
  none: "bg-slate-100 text-slate-500",
  contacted: "bg-blue-100 text-blue-700",
  in_discussion: "bg-amber-100 text-amber-700",
  partnered: "bg-emerald-100 text-emerald-700",
  declined: "bg-rose-100 text-rose-700",
};

interface Props {
  entityType: "tax_advisor" | "bank" | "ma_advisor" | "financial_planner";
  entityId: string;
  initialStatus: AllianceContactStatus;
}

export default function ContactStatusBadgeEditable({
  entityType,
  entityId,
  initialStatus,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback(
    async (newStatus: AllianceContactStatus) => {
      if (newStatus === status) {
        setEditing(false);
        return;
      }
      setSaving(true);
      try {
        const res = await fetch("/api/alliance/contact-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType,
            entityId,
            contactStatus: newStatus,
          }),
        });
        if (res.ok) {
          setStatus(newStatus);
        }
      } finally {
        setSaving(false);
        setEditing(false);
      }
    },
    [entityType, entityId, status],
  );

  if (editing) {
    return (
      <select
        value={status}
        onChange={(e) => handleChange(e.target.value as AllianceContactStatus)}
        onBlur={() => setEditing(false)}
        disabled={saving}
        autoFocus
        className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 bg-white font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        {ALLIANCE_CONTACT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {CONTACT_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer hover:ring-1 hover:ring-slate-300 transition-shadow ${COLORS[status]}`}
      title="クリックで変更"
    >
      {saving ? "..." : CONTACT_STATUS_LABELS[status]}
    </button>
  );
}
