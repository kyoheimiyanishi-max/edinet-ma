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

export interface SellerMinute {
  id: string;
  title: string;
  date: string;
  participants: string[];
  content: string;
  createdAt: string;
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
  minutes: SellerMinute[];
  documents: SellerDocument[];
  buyers: BuyerCandidate[];
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
