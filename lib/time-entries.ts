// ---- Types ----
//
// d6e is the source of truth — see `lib/d6e/repos/time-entries.ts`.

export type TimeCategory =
  | "初回面談"
  | "面談"
  | "資料作成"
  | "DD"
  | "買手開拓"
  | "AD契約"
  | "NDA"
  | "移動"
  | "社内MTG"
  | "その他";

export const TIME_CATEGORIES: TimeCategory[] = [
  "初回面談",
  "面談",
  "資料作成",
  "DD",
  "買手開拓",
  "AD契約",
  "NDA",
  "移動",
  "社内MTG",
  "その他",
];

export interface TimeEntry {
  id: string;
  employeeId?: string;
  userName: string;
  date: string; // YYYY-MM-DD
  sellerId?: string;
  sellerName?: string; // denormalized
  hours: number;
  category: TimeCategory;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntryInput {
  employeeId?: string;
  userName: string;
  date: string;
  sellerId?: string;
  hours: number;
  category: TimeCategory;
  description?: string;
}
