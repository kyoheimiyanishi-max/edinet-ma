/**
 * 公式 EDINET API (v2) クライアント。
 *
 * ラッパー API (lib/edinetdb.ts) では臨時報告書 (docTypeCode=180) を扱えないため、
 * 金融庁 EDINET の公式 API を直接叩く。主な用途は M&A 関連の 180 抽出。
 *
 * エンドポイント:
 *   書類一覧: https://api.edinet-fsa.go.jp/api/v2/documents.json?date=YYYY-MM-DD&type=2&Subscription-Key=KEY
 *   書類取得: https://api.edinet-fsa.go.jp/api/v2/documents/{docID}?type={1..5}&Subscription-Key=KEY
 *
 * 認証: Subscription-Key はクエリパラメータ (ヘッダではない) で渡す。
 *
 * レート制限:
 *   仕様書に明示記載なし。経験的に 200ms/req 程度のスロットリングで安定。
 */

const BASE = "https://api.edinet-fsa.go.jp/api/v2";

// 臨時報告書 (docTypeCode=180) のコード。
export const DOC_TYPE_CURRENT_REPORT = "180";

function apiKey(): string {
  const key = process.env.EDINET_OFFICIAL_API_KEY;
  if (!key)
    throw new Error(
      "EDINET_OFFICIAL_API_KEY is not set. Register at https://disclosure2dl.edinet-fsa.go.jp/",
    );
  return key;
}

export class EdinetOfficialApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`EDINET official API error ${status}: ${body.slice(0, 200)}`);
    this.name = "EdinetOfficialApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * 書類一覧 API (type=2) の results 配列の 1 行。
 * 仕様書 "3-1-2-2 書類一覧API（提出書類一覧及びメタデータ）" より。
 */
export interface EdinetDocumentEntry {
  seqNumber: number;
  docID: string;
  edinetCode: string | null;
  secCode: string | null;
  JCN: string | null;
  filerName: string | null;
  fundCode: string | null;
  ordinanceCode: string | null;
  formCode: string | null;
  docTypeCode: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  submitDateTime: string | null;
  docDescription: string | null;
  issuerEdinetCode: string | null;
  subjectEdinetCode: string | null;
  subsidiaryEdinetCode: string | null;
  /** 臨時報告書の提出事由。複数はカンマ区切り。M&A 分類のキー入力。 */
  currentReportReason: string | null;
  parentDocID: string | null;
  opeDateTime: string | null;
  withdrawalStatus: string | null;
  docInfoEditStatus: string | null;
  disclosureStatus: string | null;
  xbrlFlag: string | null;
  pdfFlag: string | null;
  attachDocFlag: string | null;
  englishDocFlag: string | null;
  csvFlag: string | null;
  legalStatus: string | null;
}

export interface EdinetDocumentsResponse {
  metadata: {
    title: string;
    parameter: { date: string; type: string };
    resultset: { count: number };
    processDateTime: string;
    status: string;
    message: string;
  };
  results: EdinetDocumentEntry[];
}

/**
 * 指定日の提出書類一覧を取得する。
 *
 * @param date YYYY-MM-DD (土日祝日も指定可。過去 10 年以内)
 * @param signal AbortSignal (バッチ取込のキャンセル対応)
 */
export async function listDocuments(
  date: string,
  signal?: AbortSignal,
): Promise<EdinetDocumentsResponse> {
  const url = `${BASE}/documents.json?date=${encodeURIComponent(
    date,
  )}&type=2&Subscription-Key=${encodeURIComponent(apiKey())}`;

  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EdinetOfficialApiError(res.status, text);
  }

  const data = (await res.json()) as EdinetDocumentsResponse;

  // EDINET API は HTTP 200 でエラーを返す場合がある (metadata.status で判定)。
  const status = data.metadata?.status;
  if (status && status !== "200") {
    throw new EdinetOfficialApiError(
      Number(status) || 500,
      data.metadata?.message ?? "unknown",
    );
  }
  return data;
}

/**
 * 特定日の臨時報告書 (docTypeCode=180) のみを抽出する。
 * 取下げ書類・取下げ対象の書類は除外。
 */
export async function listCurrentReports(
  date: string,
  signal?: AbortSignal,
): Promise<EdinetDocumentEntry[]> {
  const data = await listDocuments(date, signal);
  return data.results.filter(
    (row) =>
      row.docTypeCode === DOC_TYPE_CURRENT_REPORT &&
      row.withdrawalStatus !== "1" &&
      row.withdrawalStatus !== "2",
  );
}

/**
 * 書類取得 API から CSV (type=5) を ZIP バイナリで取得する。
 * 本 Phase では未使用だが、将来「相手方社名」を深掘り抽出したい場合に利用。
 */
export async function fetchDocumentCsvZip(
  docID: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const url = `${BASE}/documents/${encodeURIComponent(
    docID,
  )}?type=5&Subscription-Key=${encodeURIComponent(apiKey())}`;

  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EdinetOfficialApiError(res.status, text);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    // エラー JSON が返ってきた。
    const text = await res.text();
    throw new EdinetOfficialApiError(500, text);
  }
  return res.arrayBuffer();
}

/**
 * 書類詳細ページの URL を生成 (閲覧サイト)。
 */
export function getEdinetViewerUrl(docID: string): string {
  return `https://disclosure2.edinet-fsa.go.jp/WZEK0040.aspx?${docID}`;
}

/**
 * 簡易スロットラー。最小間隔を守るためのヘルパー。
 * batch ingestion script から使う。
 */
export function createRateLimiter(minIntervalMs: number) {
  let last = 0;
  return async function throttle(): Promise<void> {
    const now = Date.now();
    const wait = Math.max(0, last + minIntervalMs - now);
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    last = Date.now();
  };
}
