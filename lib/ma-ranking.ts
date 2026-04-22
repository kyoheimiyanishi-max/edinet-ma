import "server-only";

import { getByName } from "./edinet-codelist";
import { MA_EVENT_TYPE_LABEL, type MaEventType } from "./edinet-ma-parser";
import { findInRange as findFilingsInRange } from "./d6e/repos/ma-filings";
import { findInRange as findDealsInRange } from "./d6e/repos/ma-deals";

/**
 * M&A 集計の中核ロジック。
 *
 * ma_filings (EDINET 臨時報告書起点) と ma_deals (ニュース起点) の両ソースを
 * 読み出し、企業単位 × 年単位でカウントする。
 *
 * 企業の同定は以下の優先順位で行う:
 *   1. filer_edinet_code (EDINET コードが取れる場合)
 *   2. EDINET コードリスト名寄せ結果 (buyer/seller 社名が上場企業と一致するとき)
 *   3. 正規化した社名 (上記いずれも当たらないとき)
 *
 * ma_deals (news) は 1 件のディールに対して buyer と target の 2 関与企業を
 * カウントに立てる。ユーザー要件が「M&A 関与企業のリストアップ」のため
 * 買い手/売り手を区別せず合算する。
 */

export type RankingMode = "annual-min" | "period-min";

export interface RankingInvolvement {
  eventType: MaEventType;
  submitDate: string;
  source: "edinet" | "news";
  role: "filer" | "buyer" | "seller";
  /** 相手方社名 (取れた場合のみ) */
  counterpartyName?: string;
  docId?: string;
  docUrl?: string;
}

export interface RankingItem {
  companyKey: string;
  companyName: string;
  edinetCode: string | null;
  secCode: string | null;
  totalInPeriod: number;
  yearlyCounts: Record<number, number>;
  /** 年間最大件数 (annual-min モードの判定に使う) */
  peakYearlyCount: number;
  byEventType: Record<MaEventType, number>;
  latestDate: string;
  involvements: RankingInvolvement[];
}

export interface RankingResult {
  mode: RankingMode;
  threshold: number;
  from: string;
  to: string;
  items: RankingItem[];
  stats: {
    totalCompanies: number;
    totalInvolvements: number;
    bySource: { edinet: number; news: number };
  };
}

/** 社名の比較正規化 (EDINET コードが取れない場合の企業キー生成用) */
function normalizeCompanyName(name: string): string {
  return name
    .replace(/株式会社|（株）|\(株\)|有限会社|合同会社|合名会社|合資会社/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/** ニュースディールの category → event_type マッピング */
function mapNewsCategory(category: string): MaEventType {
  if (category.includes("TOB") || category.includes("公開買")) return "tob";
  if (category.includes("事業譲渡")) return "business_transfer";
  if (category.includes("合併")) return "merger";
  if (category.includes("分割")) return "split";
  if (category.includes("MBO")) return "stock_acquisition";
  // "M&A 買収" / "クロスボーダー" / 不明 → 株式取得
  return "stock_acquisition";
}

interface NormalizedInvolvement {
  companyKey: string;
  companyName: string;
  edinetCode: string | null;
  secCode: string | null;
  submitDate: string;
  eventType: MaEventType;
  source: "edinet" | "news";
  role: "filer" | "buyer" | "seller";
  counterpartyName?: string;
  docId?: string;
  docUrl?: string;
}

/**
 * 1 件のディール情報を企業関与レコードに正規化する。
 * edinetCode が取れれば `edinet:<code>` をキーに、取れなければ正規化社名。
 */
function resolveCompanyKey(args: { name: string; edinetCode: string | null }): {
  companyKey: string;
  edinetCode: string | null;
  secCode: string | null;
} {
  if (args.edinetCode) {
    return {
      companyKey: `edinet:${args.edinetCode}`,
      edinetCode: args.edinetCode,
      secCode: null, // filer 側は sec_code がスキーマに持つので呼び出し側で補完
    };
  }
  // コードリストで名寄せ試行
  const hit = getByName(args.name);
  if (hit) {
    return {
      companyKey: `edinet:${hit.edinetCode}`,
      edinetCode: hit.edinetCode,
      secCode: hit.secCode ?? null,
    };
  }
  return {
    companyKey: `name:${normalizeCompanyName(args.name)}`,
    edinetCode: null,
    secCode: null,
  };
}

export async function computeRanking(params: {
  from: string;
  to: string;
  mode: RankingMode;
  threshold: number;
}): Promise<RankingResult> {
  const [filings, deals] = await Promise.all([
    findFilingsInRange(params.from, params.to),
    findDealsInRange(params.from, params.to),
  ]);

  const involvements: NormalizedInvolvement[] = [];

  // 1. EDINET 臨時報告書 → 提出者を 1 件の関与として立てる
  for (const f of filings) {
    const resolved = resolveCompanyKey({
      name: f.filerName,
      edinetCode: f.filerEdinetCode,
    });
    involvements.push({
      ...resolved,
      secCode: resolved.secCode ?? f.filerSecCode,
      companyName: f.filerName,
      submitDate: f.submitDate,
      eventType: f.eventType,
      source: "edinet",
      role: "filer",
      counterpartyName: f.counterpartyName ?? undefined,
      docId: f.docId,
      docUrl: f.rawDocUrl ?? undefined,
    });
  }

  // 2. ma_deals (news) → buyer / target の両方を関与として立てる
  for (const d of deals) {
    const eventType = mapNewsCategory(d.category);
    const buyerResolved = resolveCompanyKey({
      name: d.buyer,
      edinetCode: null,
    });
    const sellerResolved = resolveCompanyKey({
      name: d.target,
      edinetCode: null,
    });

    if (d.buyer) {
      involvements.push({
        ...buyerResolved,
        companyName: d.buyer,
        submitDate: d.date,
        eventType,
        source: "news",
        role: "buyer",
        counterpartyName: d.target || undefined,
      });
    }
    if (d.target) {
      involvements.push({
        ...sellerResolved,
        companyName: d.target,
        submitDate: d.date,
        eventType,
        source: "news",
        role: "seller",
        counterpartyName: d.buyer || undefined,
      });
    }
  }

  // 3. 企業キーで集約
  const agg = new Map<string, RankingItem>();
  for (const inv of involvements) {
    if (!inv.submitDate) continue;
    const year = Number(inv.submitDate.slice(0, 4));
    if (!Number.isFinite(year)) continue;

    let item = agg.get(inv.companyKey);
    if (!item) {
      item = {
        companyKey: inv.companyKey,
        companyName: inv.companyName,
        edinetCode: inv.edinetCode,
        secCode: inv.secCode,
        totalInPeriod: 0,
        yearlyCounts: {},
        peakYearlyCount: 0,
        byEventType: {
          stock_acquisition: 0,
          merger: 0,
          split: 0,
          business_transfer: 0,
          tob: 0,
          other: 0,
        },
        latestDate: inv.submitDate,
        involvements: [],
      };
      agg.set(inv.companyKey, item);
    } else {
      // 社名は edinet_code 側を優先して上書き
      if (!item.edinetCode && inv.edinetCode) {
        item.edinetCode = inv.edinetCode;
        item.companyName = inv.companyName;
      }
      if (!item.secCode && inv.secCode) item.secCode = inv.secCode;
    }

    item.totalInPeriod += 1;
    item.yearlyCounts[year] = (item.yearlyCounts[year] ?? 0) + 1;
    if (item.yearlyCounts[year] > item.peakYearlyCount) {
      item.peakYearlyCount = item.yearlyCounts[year];
    }
    item.byEventType[inv.eventType] =
      (item.byEventType[inv.eventType] ?? 0) + 1;
    if (inv.submitDate > item.latestDate) item.latestDate = inv.submitDate;

    item.involvements.push({
      eventType: inv.eventType,
      submitDate: inv.submitDate,
      source: inv.source,
      role: inv.role,
      counterpartyName: inv.counterpartyName,
      docId: inv.docId,
      docUrl: inv.docUrl,
    });
  }

  // 4. mode でフィルタ
  const filtered = [...agg.values()].filter((item) => {
    if (params.mode === "annual-min") {
      return item.peakYearlyCount >= params.threshold;
    }
    return item.totalInPeriod >= params.threshold;
  });

  // 5. 並び順: mode に応じた件数降順 → 最新日降順 → 社名
  filtered.sort((a, b) => {
    const aKey =
      params.mode === "annual-min" ? a.peakYearlyCount : a.totalInPeriod;
    const bKey =
      params.mode === "annual-min" ? b.peakYearlyCount : b.totalInPeriod;
    if (aKey !== bKey) return bKey - aKey;
    if (a.totalInPeriod !== b.totalInPeriod)
      return b.totalInPeriod - a.totalInPeriod;
    if (a.latestDate !== b.latestDate)
      return a.latestDate < b.latestDate ? 1 : -1;
    return a.companyName.localeCompare(b.companyName, "ja");
  });

  const totalInvolvements = involvements.length;
  const bySourceEdinet = involvements.filter(
    (i) => i.source === "edinet",
  ).length;
  return {
    mode: params.mode,
    threshold: params.threshold,
    from: params.from,
    to: params.to,
    items: filtered,
    stats: {
      totalCompanies: filtered.length,
      totalInvolvements,
      bySource: {
        edinet: bySourceEdinet,
        news: totalInvolvements - bySourceEdinet,
      },
    },
  };
}

/** UI 表示用の日本語ラベル再エクスポート */
export { MA_EVENT_TYPE_LABEL };
