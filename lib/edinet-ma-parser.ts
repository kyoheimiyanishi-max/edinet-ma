import "server-only";

import type { EdinetDocumentEntry } from "./edinet-official";
import { getByEdinetCode } from "./edinet-codelist";

/**
 * 臨時報告書の「提出事由」から M&A イベント種別を判別する分類器。
 *
 * 重要な設計判断:
 *   EDINET 書類一覧 API の `currentReportReason` は **条文番号だけ** を返す
 *   (例: "第19条第2項第4号", "第19条第2項第9号の2")。docDescription も
 *   "臨時報告書" という固定文字列でしかなく、自由文言は含まれない。
 *   そのため条文番号 → M&A イベント種別のマッピングテーブルで判定する。
 *
 * マッピング根拠:
 *   企業内容等の開示に関する内閣府令 第19条第2項
 *   https://laws.e-gov.go.jp/law/348M50000040005
 *   (栗林総合法律事務所の解説を参照)
 *
 * 備考: 公開買付 (TOB) は臨時報告書 (docTypeCode=180) ではなく
 *   公開買付届出書 (docTypeCode=240) 等で提出されるため、
 *   本分類器では 'tob' は返さない。'tob' は将来 240 系を取り込む際に使う。
 */

export type MaEventType =
  | "stock_acquisition"
  | "merger"
  | "split"
  | "business_transfer"
  | "tob"
  | "other";

/**
 * 開示府令 第19条第2項 各号 → M&A イベント種別のマッピング。
 * キーは EDINET API が返す "第X号[の Y]" の部分 (条項の後半)。
 *
 * 提出者自身 vs 連結子会社が対象か、は企業の関与という観点では区別不要なので
 * 同じカテゴリに畳む。
 */
const CLAUSE_TO_EVENT_TYPE: Record<string, MaEventType> = {
  // --- 第3号: 親会社 / 特定子会社の異動 ---
  第3号: "stock_acquisition",

  // --- 第4号: 主要株主の異動 ---
  第4号: "stock_acquisition",

  // --- 第6号の2 / 第6号の3: 株式交換 / 株式移転 ---
  第6号の2: "merger",
  第6号の3: "merger",

  // --- 第7号 系: 吸収分割 / 新設分割 / 吸収合併 / 新設合併 ---
  第7号: "split",
  第7号の2: "split",
  第7号の3: "merger",
  第7号の4: "merger",

  // --- 第8号 / 第8号の2: 事業譲渡・譲受 / 子会社取得 ---
  第8号: "business_transfer",
  第8号の2: "stock_acquisition",

  // --- 第14号の2 / 第14号の3: 連結子会社の株式交換 / 株式移転 ---
  第14号の2: "merger",
  第14号の3: "merger",

  // --- 第15号 系: 連結子会社の吸収分割 / 新設分割 / 吸収合併 / 新設合併 ---
  第15号: "split",
  第15号の2: "split",
  第15号の3: "merger",
  第15号の4: "merger",

  // --- 第16号 / 第16号の2: 連結子会社の事業譲渡・譲受 / 子会社取得 ---
  第16号: "business_transfer",
  第16号の2: "stock_acquisition",
};

/**
 * M&A 判定の優先度 (条文が複数列挙されているとき、優先度の高い方を採用)。
 * 理由: 1 件の臨時報告書に 3 号 (特定子会社) と 12 号 (代表者異動) が混在する
 * ケースなどがあるため、"もっとも本質的に M&A っぽい" ほうを代表値にする。
 */
const EVENT_TYPE_PRIORITY: Record<MaEventType, number> = {
  tob: 6,
  merger: 5,
  split: 4,
  business_transfer: 3,
  stock_acquisition: 2,
  other: 1,
};

export interface MaClassification {
  eventType: MaEventType;
  /** 判定に使った条文 (例: "第19条第2項第8号の2") */
  matchedClause: string;
}

/**
 * "第19条第2項第4号" / "第19条第2項第9号の2" / カンマ区切り複数 などを
 * パースして個別の "第X号[の Y]" 配列に分解する。
 */
function extractClauses(reason: string): string[] {
  // 第19条第2項 (= 企業内容等の開示に関する内閣府令) の号 を抽出。
  //
  // 他の条文は対象外:
  //   - 第29条第2項... は 特定有価証券 (投信ファンド) 系で M&A とは無関係
  //   - 第19条の2 等の別条もスコープ外
  //
  // カンマ区切りの複数列挙に対応。
  // 例: "第19条第2項第3号,第19条第2項第8号の2" → ["第3号", "第8号の2"]
  const parts = reason
    .split(/[,、，]/)
    .map((p) => p.trim())
    .filter(Boolean);

  const clauses: string[] = [];
  for (const p of parts) {
    const m = p.match(/^第19条第2項(第\d+号(?:の\d+)?)$/);
    if (m) clauses.push(m[1]);
  }
  return clauses;
}

/**
 * currentReportReason から M&A 種別を判定する。
 * M&A 該当条文が含まれなければ null (業績予想の修正や代表者異動など非 M&A)。
 */
export function classifyMaEvent(
  reason: string | null,
  _description: string | null = null,
): MaClassification | null {
  if (!reason) return null;
  const clauses = extractClauses(reason);
  if (clauses.length === 0) return null;

  let best: { eventType: MaEventType; matchedClause: string } | null = null;
  for (const clause of clauses) {
    const eventType = CLAUSE_TO_EVENT_TYPE[clause];
    if (!eventType) continue;
    if (
      !best ||
      EVENT_TYPE_PRIORITY[eventType] > EVENT_TYPE_PRIORITY[best.eventType]
    ) {
      best = { eventType, matchedClause: `第19条第2項${clause}` };
    }
  }
  return best;
}

export interface MaFilingRecord {
  docId: string;
  submitDate: string;
  filerEdinetCode: string | null;
  filerSecCode: string | null;
  filerName: string;
  eventType: MaEventType;
  counterpartyName: string | null;
  docDescription: string | null;
  rawDocUrl: string;
}

const EDINET_VIEWER_BASE =
  "https://disclosure2.edinet-fsa.go.jp/WZEK0040.aspx?";

/**
 * M&A 関連の臨時報告書だけ抽出し、ma_filings テーブル行相当に正規化する。
 * M&A でない行や filer 名が空のものはスキップ。
 *
 * ファンド系 (内国特定有価証券) の臨時報告書は 第29条第2項... と別系統の
 * 条文になるため、extractClauses で条文が拾えず自然に null 扱いになる。
 */
export function entryToMaFiling(
  entry: EdinetDocumentEntry,
): MaFilingRecord | null {
  const classification = classifyMaEvent(
    entry.currentReportReason,
    entry.docDescription,
  );
  if (!classification) return null;
  if (!entry.filerName) return null;

  // submitDateTime は "YYYY-MM-DD hh:mm" なので先頭 10 文字で日付化
  const submitDate =
    entry.submitDateTime && entry.submitDateTime.length >= 10
      ? entry.submitDateTime.slice(0, 10)
      : "";
  if (!submitDate) return null;

  return {
    docId: entry.docID,
    submitDate,
    filerEdinetCode: entry.edinetCode,
    filerSecCode: entry.secCode,
    filerName: entry.filerName,
    eventType: classification.eventType,
    counterpartyName: extractCounterparty(entry, classification.eventType),
    docDescription:
      entry.docDescription && classification.matchedClause
        ? `${entry.docDescription} (${classification.matchedClause})`
        : entry.docDescription,
    rawDocUrl: `${EDINET_VIEWER_BASE}${entry.docID}`,
  };
}

/**
 * 相手方社名の best-effort 抽出:
 *   - 子会社異動系は subsidiaryEdinetCode → コードリスト逆引き
 *     (複数はカンマ区切りで入るので先頭のみ採用)
 *   - 対象 EDINET コードが入る場合は subjectEdinetCode → 逆引き
 * コードが無い場合は null。
 */
function extractCounterparty(
  entry: EdinetDocumentEntry,
  eventType: MaEventType,
): string | null {
  if (entry.subjectEdinetCode) {
    const hit = getByEdinetCode(entry.subjectEdinetCode);
    if (hit) return hit.name;
  }
  if (eventType === "stock_acquisition" && entry.subsidiaryEdinetCode) {
    const first = entry.subsidiaryEdinetCode.split(",")[0]?.trim();
    if (first) {
      const hit = getByEdinetCode(first);
      if (hit) return hit.name;
    }
  }
  return null;
}

/** 集計 / UI 表示用の日本語ラベル。 */
export const MA_EVENT_TYPE_LABEL: Record<MaEventType, string> = {
  stock_acquisition: "株式取得",
  merger: "合併",
  split: "会社分割",
  business_transfer: "事業譲渡",
  tob: "公開買付",
  other: "その他",
};
