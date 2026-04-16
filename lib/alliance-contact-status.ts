// Alliance partner contact / relationship status.
// Shared across tax_advisors, banks, ma_advisors, financial_planners.

export type AllianceContactStatus =
  | "none"
  | "contacted"
  | "in_discussion"
  | "partnered"
  | "declined";

export const ALLIANCE_CONTACT_STATUSES: readonly AllianceContactStatus[] = [
  "none",
  "contacted",
  "in_discussion",
  "partnered",
  "declined",
] as const;

export const CONTACT_STATUS_LABELS: Record<AllianceContactStatus, string> = {
  none: "未接触",
  contacted: "接触済",
  in_discussion: "商談中",
  partnered: "提携中",
  declined: "見送り",
};

export const CONTACT_STATUS_COLORS: Record<AllianceContactStatus, string> = {
  none: "bg-slate-100 text-slate-500",
  contacted: "bg-blue-100 text-blue-700",
  in_discussion: "bg-amber-100 text-amber-700",
  partnered: "bg-emerald-100 text-emerald-700",
  declined: "bg-rose-100 text-rose-700",
};
