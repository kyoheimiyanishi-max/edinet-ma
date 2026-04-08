import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * EDINETコードリスト (金融庁) のローカルキャッシュ。
 *
 * data/edinet-codelist.json は scripts/sync-edinet-codelist.mjs が生成する。
 * このモジュールは初回アクセス時に1度だけ JSON をパースして
 *   - edinet_code → entry
 *   - corporate_number → entry
 * の Map をプロセス全体で共有する。サーバープロセス1つあたり ~10MB の
 * RSS 増を許容する代わりに、検索ごとの I/O とパースを完全に排除する。
 *
 * EDINET API (edinetdb.jp) は corporate_number を返さないため、
 * このマッピングが gBizINFO とのマージに必須となる。
 */

export type EdinetListingStatus = "listed" | "unlisted" | "unknown";

export interface EdinetCodelistEntry {
  edinetCode: string;
  name: string;
  listingStatus: EdinetListingStatus;
  corporateNumber?: string;
  secCode?: string;
  industry?: string;
  capitalAmount?: number;
}

interface CodelistFile {
  source: string;
  generatedAt: string;
  metaLine: string;
  count: number;
  entries: EdinetCodelistEntry[];
}

interface LoadedCodelist {
  generatedAt: string;
  count: number;
  byEdinetCode: Map<string, EdinetCodelistEntry>;
  byCorporateNumber: Map<string, EdinetCodelistEntry>;
}

let cached: LoadedCodelist | null = null;
let loadError: Error | null = null;

const JSON_PATH = join(process.cwd(), "data", "edinet-codelist.json");

function load(): LoadedCodelist | null {
  if (cached) return cached;
  if (loadError) return null;

  try {
    const raw = readFileSync(JSON_PATH, "utf8");
    const parsed = JSON.parse(raw) as CodelistFile;

    const byEdinetCode = new Map<string, EdinetCodelistEntry>();
    const byCorporateNumber = new Map<string, EdinetCodelistEntry>();

    for (const entry of parsed.entries) {
      byEdinetCode.set(entry.edinetCode, entry);
      if (entry.corporateNumber) {
        byCorporateNumber.set(entry.corporateNumber, entry);
      }
    }

    cached = {
      generatedAt: parsed.generatedAt,
      count: parsed.count,
      byEdinetCode,
      byCorporateNumber,
    };
    return cached;
  } catch (e) {
    loadError = e instanceof Error ? e : new Error(String(e));
    console.warn(
      `[edinet-codelist] failed to load ${JSON_PATH}: ${loadError.message}\n` +
        `  → run \`pnpm exec tsx scripts/sync-edinet-codelist.mjs\` to generate it.`,
    );
    return null;
  }
}

/** EDINETコードからエントリを取得。未取り込みの場合は null。 */
export function getByEdinetCode(
  edinetCode: string,
): EdinetCodelistEntry | null {
  const cl = load();
  return cl?.byEdinetCode.get(edinetCode) ?? null;
}

/** 法人番号からエントリを取得。未取り込みの場合は null。 */
export function getByCorporateNumber(
  corporateNumber: string,
): EdinetCodelistEntry | null {
  const cl = load();
  return cl?.byCorporateNumber.get(corporateNumber) ?? null;
}

/**
 * 複数 EDINETコードを一括で引く。マッピングが存在しないコードは
 * 結果に含まれない。読み込み失敗時は空 Map。
 */
export function getManyByEdinetCode(
  edinetCodes: readonly string[],
): Map<string, EdinetCodelistEntry> {
  const cl = load();
  const out = new Map<string, EdinetCodelistEntry>();
  if (!cl) return out;
  for (const code of edinetCodes) {
    const entry = cl.byEdinetCode.get(code);
    if (entry) out.set(code, entry);
  }
  return out;
}

/** 複数法人番号を一括で引く。 */
export function getManyByCorporateNumber(
  corporateNumbers: readonly string[],
): Map<string, EdinetCodelistEntry> {
  const cl = load();
  const out = new Map<string, EdinetCodelistEntry>();
  if (!cl) return out;
  for (const num of corporateNumbers) {
    const entry = cl.byCorporateNumber.get(num);
    if (entry) out.set(num, entry);
  }
  return out;
}

/** デバッグ用: 取り込み済みエントリ数と生成日。未取り込みなら null。 */
export function getCodelistInfo(): {
  count: number;
  generatedAt: string;
} | null {
  const cl = load();
  return cl ? { count: cl.count, generatedAt: cl.generatedAt } : null;
}
