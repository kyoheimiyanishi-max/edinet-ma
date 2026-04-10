// ---- Types ----
//
// d6e is the source of truth — see `lib/d6e/repos/outreach.ts`.
// This module only holds types and enum constants.

export type OutreachChannel = "email" | "mail" | "phone" | "form" | "meeting";

export type OutreachStatus =
  | "sent"
  | "delivered"
  | "opened"
  | "replied"
  | "bounced"
  | "failed";

export const OUTREACH_CHANNELS: OutreachChannel[] = [
  "email",
  "mail",
  "phone",
  "form",
  "meeting",
];

export const OUTREACH_STATUSES: OutreachStatus[] = [
  "sent",
  "delivered",
  "opened",
  "replied",
  "bounced",
  "failed",
];

export const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: "Email",
  mail: "郵送",
  phone: "電話",
  form: "フォーム",
  meeting: "面談",
};

export const STATUS_LABELS: Record<OutreachStatus, string> = {
  sent: "送付済",
  delivered: "着信",
  opened: "開封",
  replied: "返信あり",
  bounced: "エラー",
  failed: "失敗",
};

export interface OutreachTemplate {
  id: string;
  name: string;
  channel: OutreachChannel;
  subject?: string;
  body: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachLog {
  id: string;
  buyerCompanyId?: string;
  buyerCompanyName?: string; // denormalized for display
  sellerId?: string;
  sellerName?: string; // denormalized
  templateId?: string;
  templateName?: string; // denormalized
  channel: OutreachChannel;
  subject?: string;
  body?: string;
  sentAt: string;
  sentBy?: string;
  status: OutreachStatus;
  replyText?: string;
  notes?: string;
  createdAt: string;
}

export interface OutreachTemplateInput {
  name: string;
  channel: OutreachChannel;
  subject?: string;
  body: string;
  description?: string;
}

export interface OutreachLogInput {
  buyerCompanyId?: string;
  sellerId?: string;
  templateId?: string;
  channel: OutreachChannel;
  subject?: string;
  body?: string;
  sentBy?: string;
  status?: OutreachStatus;
  replyText?: string;
  notes?: string;
}
