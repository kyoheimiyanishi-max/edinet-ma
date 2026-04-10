// ---- Types ----
//
// d6e is the source of truth — see `lib/d6e/repos/events.ts`.

export type EventType =
  | "初回面談"
  | "面談"
  | "訪問"
  | "電話"
  | "社内MTG"
  | "イベント"
  | "セミナー"
  | "展示会"
  | "その他";

export type EventStatus = "予定" | "完了" | "キャンセル" | "延期";

export const EVENT_TYPES: EventType[] = [
  "初回面談",
  "面談",
  "訪問",
  "電話",
  "社内MTG",
  "イベント",
  "セミナー",
  "展示会",
  "その他",
];

export const EVENT_STATUSES: EventStatus[] = [
  "予定",
  "完了",
  "キャンセル",
  "延期",
];

export interface CalendarEvent {
  id: string;
  title: string;
  eventType: EventType;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  location?: string;
  sellerId?: string;
  sellerName?: string;
  buyerCompanyId?: string;
  buyerCompanyName?: string;
  attendees: string[];
  description?: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventInput {
  title: string;
  eventType: EventType;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  sellerId?: string;
  buyerCompanyId?: string;
  attendees?: string[];
  description?: string;
  status?: EventStatus;
}
