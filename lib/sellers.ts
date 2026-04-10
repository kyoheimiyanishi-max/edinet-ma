// ---- Types ----
//
// d6e is the source of truth for seller data — see
// `lib/d6e/repos/sellers.ts` for read/write operations. The Seller
// aggregate is assembled from four d6e tables:
//   sellers, meeting_minutes, seller_documents, seller_buyer_candidates
//
// The exports below provide the type system and display helpers used
// by the repo, route handlers, and UI components.

export type BuyerSource = "ai" | "manual";

export type BuyerStatus =
  | "候補"
  | "打診中"
  | "面談済"
  | "LOI受領"
  | "交渉中"
  | "成約"
  | "見送り";

export interface BuyerCandidate {
  id: string;
  companyCode: string;
  companyName: string;
  industry?: string;
  source: BuyerSource;
  reasoning: string;
  status: BuyerStatus;
  addedAt: string;
  updatedAt: string;
}

export type RecordType = "議事録" | "メール" | "Slack" | "メモ" | "電話";

export const RECORD_TYPES: RecordType[] = [
  "議事録",
  "メール",
  "Slack",
  "メモ",
  "電話",
];

export type TaskStatus = "未着手" | "進行中" | "完了" | "保留";
export type TaskPriority = "高" | "中" | "低";

export const TASK_STATUSES: TaskStatus[] = ["未着手", "進行中", "完了", "保留"];
export const TASK_PRIORITIES: TaskPriority[] = ["高", "中", "低"];

export interface SellerMinute {
  id: string;
  title: string;
  date: string;
  participants: string[];
  content: string;
  recordType: RecordType;
  createdAt: string;
}

export interface SellerTask {
  id: string;
  sellerId: string;
  title: string;
  description?: string;
  dueDate?: string;
  assignee?: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

export interface SellerDocument {
  id: string;
  title: string;
  content: string;
  uploadedAt: string;
}

export type SellerStage =
  | "初回面談"
  | "情報収集"
  | "買い手選定"
  | "打診中"
  | "交渉中"
  | "成約"
  | "見送り";

export type SellerRank = "A" | "B" | "C" | "D";
export type MediatorType = "仲介" | "買FA" | "FA" | "両面";

export interface Seller {
  id: string;
  companyName: string;
  companyCode?: string;
  industry?: string;
  prefecture?: string;
  description: string;
  profile: string; // AI-generated or manual summary
  desiredTerms: string; // 売主の希望条件（価格・時期・条件など）
  stage: SellerStage;
  // 構造化カラム (Excel 案件管理表由来)
  priority?: string; // "★" or undefined
  rank?: SellerRank;
  assignedTo?: string; // 担当者
  mediatorType?: MediatorType; // 仲介 / 買FA / FA / 両面
  introSource?: string; // 紹介元
  feeEstimate?: string; // 手数料想定 (freeform)
  ndaSigned: boolean;
  adSigned: boolean;
  folderUrl?: string; // Google Drive 等のフォルダリンク
  // 売却関連 (マスト項目)
  closeDate?: string; // クローズ予定日 (YYYY-MM-DD)
  targetPrice?: string; // 売却金額目標 (例: 5億円～10億円)
  saleSchedule?: string; // 売却予定スケジュール (例: 2026年上期)
  minutes: SellerMinute[];
  documents: SellerDocument[];
  buyers: BuyerCandidate[];
  tasks: SellerTask[];
  createdAt: string;
  updatedAt: string;
}

export type SellerInput = Pick<
  Seller,
  | "companyName"
  | "companyCode"
  | "industry"
  | "prefecture"
  | "description"
  | "profile"
  | "desiredTerms"
  | "stage"
  | "priority"
  | "rank"
  | "assignedTo"
  | "mediatorType"
  | "introSource"
  | "feeEstimate"
  | "closeDate"
  | "targetPrice"
  | "saleSchedule"
  | "folderUrl"
> & {
  // これらは Seller 型上 required だが、Input では optional (デフォルト false)
  ndaSigned?: boolean;
  adSigned?: boolean;
};

export const SELLER_STAGES: SellerStage[] = [
  "初回面談",
  "情報収集",
  "買い手選定",
  "打診中",
  "交渉中",
  "成約",
  "見送り",
];

export const SELLER_RANKS: SellerRank[] = ["A", "B", "C", "D"];

export const MEDIATOR_TYPES: MediatorType[] = ["仲介", "買FA", "FA", "両面"];

/** M&A 実務で使われる主要業種 (登録時の選択肢) */
export const SELLER_INDUSTRIES = [
  "IT・ソフトウェア",
  "SaaS",
  "EC・通販",
  "AI・機械学習",
  "Webメディア",
  "デジタルマーケティング",
  "人材・HR",
  "教育・EdTech",
  "医療・ヘルスケア",
  "介護・福祉",
  "製造業",
  "建設・不動産",
  "食品・飲料",
  "農業・水産",
  "物流・運輸",
  "金融・保険",
  "コンサルティング",
  "小売・サービス",
  "飲食・外食",
  "美容・エステ",
  "旅行・ホテル",
  "エンタメ・メディア",
  "広告・PR",
  "ゲーム・アプリ",
  "通信・インフラ",
  "エネルギー・環境",
  "自動車・モビリティ",
  "その他",
] as const;

export const BUYER_STATUSES: BuyerStatus[] = [
  "候補",
  "打診中",
  "面談済",
  "LOI受領",
  "交渉中",
  "成約",
  "見送り",
];

// ---- Display helpers ----

export function getSellerStageColor(stage: SellerStage): string {
  const colors: Record<SellerStage, string> = {
    初回面談: "bg-slate-100 text-slate-600",
    情報収集: "bg-blue-100 text-blue-700",
    買い手選定: "bg-indigo-100 text-indigo-700",
    打診中: "bg-amber-100 text-amber-700",
    交渉中: "bg-orange-100 text-orange-700",
    成約: "bg-emerald-100 text-emerald-700",
    見送り: "bg-rose-100 text-rose-700",
  };
  return colors[stage];
}

export function getBuyerStatusColor(status: BuyerStatus): string {
  const colors: Record<BuyerStatus, string> = {
    候補: "bg-slate-100 text-slate-600",
    打診中: "bg-blue-100 text-blue-700",
    面談済: "bg-indigo-100 text-indigo-700",
    LOI受領: "bg-purple-100 text-purple-700",
    交渉中: "bg-amber-100 text-amber-700",
    成約: "bg-emerald-100 text-emerald-700",
    見送り: "bg-rose-100 text-rose-700",
  };
  return colors[status];
}
