import "server-only";

import type { MaEventType, MaFilingRecord } from "@/lib/edinet-ma-parser";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for the `ma_filings` table (EDINET 臨時報告書起点の
 * M&A 履歴)。
 *
 * スキーマは scripts/migrations/003_create_ma_filings.sql を参照。
 *
 * 書き込みは `upsert` を推奨: 同 docId の再取込をべき等に扱う。
 */

interface MaFilingRow {
  id: string;
  doc_id: string;
  submit_date: string;
  filer_edinet_code: string | null;
  filer_sec_code: string | null;
  filer_name: string;
  event_type: MaEventType;
  counterparty_name: string | null;
  doc_description: string | null;
  source: string;
  raw_doc_url: string | null;
}

const SELECT_COLUMNS =
  "id, doc_id, submit_date, filer_edinet_code, filer_sec_code, filer_name, event_type, counterparty_name, doc_description, source, raw_doc_url";

export interface MaFiling {
  id: string;
  docId: string;
  submitDate: string;
  filerEdinetCode: string | null;
  filerSecCode: string | null;
  filerName: string;
  eventType: MaEventType;
  counterpartyName: string | null;
  docDescription: string | null;
  source: string;
  rawDocUrl: string | null;
}

function rowToFiling(row: MaFilingRow): MaFiling {
  return {
    id: row.id,
    docId: row.doc_id,
    submitDate: row.submit_date,
    filerEdinetCode: row.filer_edinet_code,
    filerSecCode: row.filer_sec_code,
    filerName: row.filer_name,
    eventType: row.event_type,
    counterpartyName: row.counterparty_name,
    docDescription: row.doc_description,
    source: row.source,
    rawDocUrl: row.raw_doc_url,
  };
}

// ---- Reads ----

export async function findByDocId(docId: string): Promise<MaFiling | null> {
  const result = await executeSql<MaFilingRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_filings")}
     WHERE doc_id = ${escapeSqlValue(docId)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToFiling(row) : null;
}

/**
 * 期間内の全件を取得する (企業別集計用)。
 * 大量になりうるので from/to は必須、両端包含。
 */
export async function findInRange(
  from: string,
  to: string,
): Promise<MaFiling[]> {
  const result = await executeSql<MaFilingRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("ma_filings")}
     WHERE submit_date >= ${escapeSqlValue(from)}
       AND submit_date <= ${escapeSqlValue(to)}
     ORDER BY submit_date DESC`,
  );
  return (result.rows ?? []).map(rowToFiling);
}

// ---- Writes ----

/**
 * doc_id をキーに UPSERT する。同じ書類の再取込はべき等。
 * source は常に 'edinet' を書き込む (news 起点は ma_deals 側)。
 */
export async function upsertFromEdinet(
  record: MaFilingRecord,
): Promise<{ inserted: boolean }> {
  const existing = await findByDocId(record.docId);
  if (existing) {
    // 既存なら description / counterparty のみ更新 (再分類に備える)
    await executeSql(
      `UPDATE ${tableRef("ma_filings")}
         SET event_type = ${escapeSqlValue(record.eventType)},
             counterparty_name = ${escapeSqlValue(record.counterpartyName)},
             doc_description = ${escapeSqlValue(record.docDescription)},
             filer_name = ${escapeSqlValue(record.filerName)},
             filer_edinet_code = ${escapeSqlValue(record.filerEdinetCode)},
             filer_sec_code = ${escapeSqlValue(record.filerSecCode)},
             raw_doc_url = ${escapeSqlValue(record.rawDocUrl)},
             updated_at = now()
       WHERE doc_id = ${escapeSqlValue(record.docId)}`,
    );
    return { inserted: false };
  }

  const result = await executeSql(
    `INSERT INTO ${tableRef("ma_filings")}
       (doc_id, submit_date, filer_edinet_code, filer_sec_code, filer_name,
        event_type, counterparty_name, doc_description, source, raw_doc_url)
     VALUES (
       ${escapeSqlValue(record.docId)},
       ${escapeSqlValue(record.submitDate)},
       ${escapeSqlValue(record.filerEdinetCode)},
       ${escapeSqlValue(record.filerSecCode)},
       ${escapeSqlValue(record.filerName)},
       ${escapeSqlValue(record.eventType)},
       ${escapeSqlValue(record.counterpartyName)},
       ${escapeSqlValue(record.docDescription)},
       'edinet',
       ${escapeSqlValue(record.rawDocUrl)}
     )`,
  );
  if ((result.affected_rows ?? 0) < 1) {
    throw new D6eApiError("INSERT affected 0 rows", 500, "INSERT_NO_EFFECT");
  }
  return { inserted: true };
}

/**
 * 企業 (filer_edinet_code) × 年 の M&A 件数を集計する。
 * event_type 内訳もまとめて返す。
 */
export interface CompanyYearlyCount {
  filerEdinetCode: string | null;
  filerName: string;
  year: number;
  total: number;
  byEventType: Record<MaEventType, number>;
}

export async function aggregateByCompanyYear(
  from: string,
  to: string,
): Promise<CompanyYearlyCount[]> {
  const result = await executeSql<{
    filer_edinet_code: string | null;
    filer_name: string;
    year: number | string;
    event_type: MaEventType;
    count: number | string;
  }>(
    `SELECT filer_edinet_code,
            filer_name,
            EXTRACT(YEAR FROM submit_date)::int AS year,
            event_type,
            COUNT(*)::int AS count
       FROM ${tableRef("ma_filings")}
      WHERE submit_date >= ${escapeSqlValue(from)}
        AND submit_date <= ${escapeSqlValue(to)}
      GROUP BY filer_edinet_code, filer_name, year, event_type
      ORDER BY year DESC, count DESC`,
  );

  const map = new Map<string, CompanyYearlyCount>();
  for (const row of result.rows ?? []) {
    const year = Number(row.year);
    const count = Number(row.count);
    // 企業キーは edinet_code を優先、無ければ filer_name で代替
    const key = `${row.filer_edinet_code ?? ""}::${row.filer_name}::${year}`;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        filerEdinetCode: row.filer_edinet_code,
        filerName: row.filer_name,
        year,
        total: 0,
        byEventType: {
          stock_acquisition: 0,
          merger: 0,
          split: 0,
          business_transfer: 0,
          tob: 0,
          other: 0,
        },
      };
      map.set(key, entry);
    }
    entry.total += count;
    entry.byEventType[row.event_type] =
      (entry.byEventType[row.event_type] ?? 0) + count;
  }
  return [...map.values()];
}
