import { readFile } from "fs/promises";
import path from "path";

export interface Deal {
  id: string;
  date: string;
  buyer: string;
  target: string;
  amount: number;
  currency: string;
  category: string;
  status: string;
  summary: string;
  holdingPct?: number | null;
}

const DATA_PATH = path.join(process.cwd(), "data", "deals.json");

export async function getAllDeals(): Promise<Deal[]> {
  const raw = await readFile(DATA_PATH, "utf-8");
  const deals: Deal[] = JSON.parse(raw);
  deals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return deals;
}

export function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000_000) {
    const t = amount / 1_000_000_000_000;
    return `${t % 1 === 0 ? t.toFixed(0) : t.toFixed(1)}兆円`;
  }
  if (amount >= 100_000_000) {
    const oku = amount / 100_000_000;
    return `${oku % 1 === 0 ? oku.toFixed(0) : oku.toFixed(0)}億円`;
  }
  return `${amount.toLocaleString()}円`;
}

export function getDealStatusColor(status: string): string {
  const colors: Record<string, string> = {
    完了: "bg-green-100 text-green-700",
    進行中: "bg-blue-100 text-blue-700",
    交渉中: "bg-amber-100 text-amber-700",
    審査中: "bg-purple-100 text-purple-700",
    検討中: "bg-slate-100 text-slate-600",
  };
  return colors[status] || "bg-slate-100 text-slate-600";
}

/**
 * 買手企業名でディールをフィルタ。
 * company.name (例: "ルネサスエレクトロニクス株式会社") と deals.buyer
 * (例: "ルネサスエレクトロニクス") の部分一致で判定する。
 */
export async function getDealsByBuyer(buyerName: string): Promise<Deal[]> {
  const all = await getAllDeals();
  const short = buyerName
    .replace(/株式会社|（株）|有限会社|合同会社/g, "")
    .trim();
  return all.filter((d) => {
    const dBuyer = d.buyer
      .replace(/株式会社|（株）|有限会社|合同会社/g, "")
      .trim();
    return dBuyer.includes(short) || short.includes(dBuyer);
  });
}

export function getDealCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    MBO: "bg-emerald-100 text-emerald-700",
    TOB: "bg-red-100 text-red-700",
    敵対的TOB: "bg-rose-100 text-rose-700",
    クロスボーダー: "bg-cyan-100 text-cyan-700",
    "M&A 買収": "bg-blue-100 text-blue-700",
    事業譲渡: "bg-amber-100 text-amber-700",
  };
  return colors[category] || "bg-slate-100 text-slate-600";
}
