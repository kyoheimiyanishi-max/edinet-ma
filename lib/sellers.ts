import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ---- Types ----

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
>;

export const SELLER_STAGES: SellerStage[] = [
  "初回面談",
  "情報収集",
  "買い手選定",
  "打診中",
  "交渉中",
  "成約",
  "見送り",
];

export const BUYER_STATUSES: BuyerStatus[] = [
  "候補",
  "打診中",
  "面談済",
  "LOI受領",
  "交渉中",
  "成約",
  "見送り",
];

// ---- Storage ----

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "sellers.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
}

function readAll(): Seller[] {
  ensureDataFile();
  return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as Seller[];
}

function writeAll(sellers: Seller[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(sellers, null, 2), "utf-8");
}

// ---- Seller CRUD ----

export function getAllSellers(): Seller[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getSeller(id: string): Seller | undefined {
  return readAll().find((s) => s.id === id);
}

export function createSeller(input: SellerInput): Seller {
  const sellers = readAll();
  const now = new Date().toISOString();
  const seller: Seller = {
    id: crypto.randomUUID(),
    companyName: input.companyName,
    companyCode: input.companyCode || undefined,
    industry: input.industry || undefined,
    prefecture: input.prefecture || undefined,
    description: input.description || "",
    profile: input.profile || "",
    desiredTerms: input.desiredTerms || "",
    stage: input.stage || "初回面談",
    minutes: [],
    documents: [],
    buyers: [],
    createdAt: now,
    updatedAt: now,
  };
  sellers.push(seller);
  writeAll(sellers);
  return seller;
}

export function updateSeller(
  id: string,
  input: Partial<SellerInput>,
): Seller | null {
  const sellers = readAll();
  const idx = sellers.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  sellers[idx] = {
    ...sellers[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  writeAll(sellers);
  return sellers[idx];
}

export function deleteSeller(id: string): boolean {
  const sellers = readAll();
  const filtered = sellers.filter((s) => s.id !== id);
  if (filtered.length === sellers.length) return false;
  writeAll(filtered);
  return true;
}

// ---- Minute ops ----

export function addMinute(
  sellerId: string,
  input: Omit<SellerMinute, "id" | "createdAt">,
): Seller | null {
  const sellers = readAll();
  const idx = sellers.findIndex((s) => s.id === sellerId);
  if (idx === -1) return null;
  const minute: SellerMinute = {
    id: crypto.randomUUID(),
    title: input.title,
    date: input.date,
    participants: input.participants,
    content: input.content,
    createdAt: new Date().toISOString(),
  };
  sellers[idx].minutes.push(minute);
  sellers[idx].updatedAt = new Date().toISOString();
  writeAll(sellers);
  return sellers[idx];
}

export function deleteMinute(
  sellerId: string,
  minuteId: string,
): Seller | null {
  const sellers = readAll();
  const idx = sellers.findIndex((s) => s.id === sellerId);
  if (idx === -1) return null;
  sellers[idx].minutes = sellers[idx].minutes.filter((m) => m.id !== minuteId);
  sellers[idx].updatedAt = new Date().toISOString();
  writeAll(sellers);
  return sellers[idx];
}

// ---- Document ops ----

export function addDocument(
  sellerId: string,
  input: Omit<SellerDocument, "id" | "uploadedAt">,
): Seller | null {
  const sellers = readAll();
  const idx = sellers.findIndex((s) => s.id === sellerId);
  if (idx === -1) return null;
  const doc: SellerDocument = {
    id: crypto.randomUUID(),
    title: input.title,
    content: input.content,
    uploadedAt: new Date().toISOString(),
  };
  sellers[idx].documents.push(doc);
  sellers[idx].updatedAt = new Date().toISOString();
  writeAll(sellers);
  return sellers[idx];
}

export function deleteDocument(
  sellerId: string,
  documentId: string,
): Seller | null {
  const sellers = readAll();
  const idx = sellers.findIndex((s) => s.id === sellerId);
  if (idx === -1) return null;
  sellers[idx].documents = sellers[idx].documents.filter(
    (d) => d.id !== documentId,
  );
  sellers[idx].updatedAt = new Date().toISOString();
  writeAll(sellers);
  return sellers[idx];
}

// ---- Buyer ops ----

export function addBuyer(
  sellerId: string,
  input: Omit<BuyerCandidate, "id" | "addedAt" | "updatedAt">,
): Seller | null {
  const sellers = readAll();
  const idx = sellers.findIndex((s) => s.id === sellerId);
  if (idx === -1) return null;
  // Skip if the same companyCode already exists
  const exists = sellers[idx].buyers.some(
    (b) =>
      (input.companyCode && b.companyCode === input.companyCode) ||
      b.companyName === input.companyName,
  );
  if (exists) {
    return sellers[idx];
  }
  const now = new Date().toISOString();
  const buyer: BuyerCandidate = {
    id: crypto.randomUUID(),
    companyCode: input.companyCode || "",
    companyName: input.companyName,
    industry: input.industry,
    source: input.source,
    reasoning: input.reasoning || "",
    status: input.status || "候補",
    addedAt: now,
    updatedAt: now,
  };
  sellers[idx].buyers.push(buyer);
  sellers[idx].updatedAt = now;
  writeAll(sellers);
  return sellers[idx];
}

export function updateBuyer(
  sellerId: string,
  buyerId: string,
  input: Partial<Omit<BuyerCandidate, "id" | "addedAt">>,
): Seller | null {
  const sellers = readAll();
  const idx = sellers.findIndex((s) => s.id === sellerId);
  if (idx === -1) return null;
  const bIdx = sellers[idx].buyers.findIndex((b) => b.id === buyerId);
  if (bIdx === -1) return null;
  sellers[idx].buyers[bIdx] = {
    ...sellers[idx].buyers[bIdx],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  sellers[idx].updatedAt = new Date().toISOString();
  writeAll(sellers);
  return sellers[idx];
}

export function deleteBuyer(sellerId: string, buyerId: string): Seller | null {
  const sellers = readAll();
  const idx = sellers.findIndex((s) => s.id === sellerId);
  if (idx === -1) return null;
  sellers[idx].buyers = sellers[idx].buyers.filter((b) => b.id !== buyerId);
  sellers[idx].updatedAt = new Date().toISOString();
  writeAll(sellers);
  return sellers[idx];
}

// ---- Helpers ----

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
