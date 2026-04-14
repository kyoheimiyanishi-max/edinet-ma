import "server-only";

/**
 * CSV 文字列化 (RFC 4180 準拠) と、Excel で直接開ける UTF-8 BOM 付き Response 生成。
 *
 * 日本語を Excel で直接開くと文字化けするため、BOM (0xEF 0xBB 0xBF) を
 * 先頭に付けるのが鉄板。ライブラリ依存ゼロ。
 */

export type CsvCell = string | number | boolean | null | undefined | Date;

function escapeCell(v: CsvCell): string {
  if (v == null) return "";
  let s: string;
  if (v instanceof Date) s = v.toISOString();
  else if (typeof v === "boolean") s = v ? "true" : "false";
  else s = String(v);
  // CR/LF, カンマ, ダブルクオートを含むなら "" 囲み + " をエスケープ
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: readonly (readonly CsvCell[])[]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

const UTF8_BOM = "\ufeff";

/**
 * 指定ファイル名で CSV をブラウザダウンロードさせる Response を返す。
 * ファイル名は RFC 5987 の UTF-8 形式でも冗長に指定し、日本語名でも
 * 文字化けしないようにする。
 */
export function csvResponse(csv: string, filename: string): Response {
  const body = UTF8_BOM + csv;
  const asciiFallback = filename.replace(/[^\x20-\x7E]+/g, "_");
  const encoded = encodeURIComponent(filename);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
