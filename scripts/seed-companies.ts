/**
 * Seed the d6e `companies` table from data/edinet-codelist.json.
 *
 * Bulk-inserts ~11k EDINET-listed Japanese companies in batches of 100
 * via the multi-row VALUES syntax. Idempotent: skips entries whose
 * corporate_number already exists in d6e.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-companies.ts
 */

import codelistData from "../data/edinet-codelist.json";

import { executeSql } from "../lib/d6e/client";
import {
  bulkInsert,
  type CompanyInput,
  type ListingStatus,
} from "../lib/d6e/repos/companies";
import { tableRef } from "../lib/d6e/sql";

interface CodelistEntry {
  edinetCode: string;
  name: string;
  listingStatus: "listed" | "unlisted" | "unknown";
  corporateNumber?: string;
  secCode?: string;
  industry?: string;
  capitalAmount?: number;
}

interface Codelist {
  generatedAt: string;
  count: number;
  entries: CodelistEntry[];
}

const BATCH_SIZE = 100;

function entryToInput(e: CodelistEntry): CompanyInput {
  // edinet-codelist の listingStatus は 3 値だが d6e は 6 値の CHECK。
  // listed/unlisted は素直に対応、unknown は未指定 (undefined→NULL)。
  let listingStatus: ListingStatus | undefined;
  if (e.listingStatus === "listed") listingStatus = "listed";
  else if (e.listingStatus === "unlisted") listingStatus = "unlisted";

  return {
    name: e.name.replace(/\s+/g, ""), // codelist には全角スペース入りがある
    ...(e.corporateNumber ? { corporateNumber: e.corporateNumber } : {}),
    edinetCode: e.edinetCode,
    ...(e.secCode ? { secCode: e.secCode } : {}),
    ...(e.industry ? { industryDetail: e.industry } : {}),
    ...(listingStatus ? { listingStatus } : {}),
  };
}

async function loadExistingEdinetCodes(): Promise<Set<string>> {
  const result = await executeSql<{ edinet_code: string }>(
    `SELECT edinet_code FROM ${tableRef("companies")} WHERE edinet_code IS NOT NULL`,
  );
  return new Set((result.rows ?? []).map((r) => r.edinet_code));
}

async function main(): Promise<void> {
  const codelist = codelistData as Codelist;
  console.log(
    `📥  Loading edinet-codelist.json (${codelist.count} entries, generated ${codelist.generatedAt})`,
  );

  const existing = await loadExistingEdinetCodes();
  console.log(
    `📊  d6e already has ${existing.size} companies with edinet_code`,
  );

  const toInsert = codelist.entries.filter((e) => !existing.has(e.edinetCode));
  console.log(`🆕  ${toInsert.length} new entries to seed`);

  if (toInsert.length === 0) {
    console.log("nothing to do");
    return;
  }

  let inserted = 0;
  let failed = 0;
  const batchCount = Math.ceil(toInsert.length / BATCH_SIZE);

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const inputs = batch.map(entryToInput);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    try {
      const n = await bulkInsert(inputs);
      inserted += n;
      console.log(
        `  batch ${batchNum}/${batchCount}: +${n} rows (running total ${inserted})`,
      );
    } catch (e) {
      failed += batch.length;
      const message = e instanceof Error ? e.message : String(e);
      console.error(
        `  batch ${batchNum}/${batchCount}: ❌ ${message.slice(0, 200)}`,
      );
      // continue with next batch
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(`inserted: ${inserted}  |  failed: ${failed}`);

  const finalCount = await executeSql<{ n: number }>(
    `SELECT count(*)::int as n FROM ${tableRef("companies")}`,
  );
  console.log(`d6e companies total: ${finalCount.rows?.[0]?.n ?? "?"}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
