/**
 * Download the EDINET codelist (金融庁) and emit data/edinet-codelist.json.
 *
 * Source: https://disclosure2dl.edinet-fsa.go.jp/searchdocument/codelist/Edinetcode.zip
 *
 * The archive contains a single Shift-JIS CSV (EdinetcodeDlInfo.csv) with
 * one row per EDINET filer (≈11,000 entries). We project only the columns
 * we need for unified-company lookups and write JSON to disk.
 *
 * Run:
 *   pnpm exec tsx scripts/sync-edinet-codelist.mjs
 *   (or: node scripts/sync-edinet-codelist.mjs)
 *
 * Dependencies: the system `unzip` command (available on macOS and Linux
 * by default). No npm deps required.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CODELIST_URL =
  "https://disclosure2dl.edinet-fsa.go.jp/searchdocument/codelist/Edinetcode.zip";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const OUTPUT_PATH = join(ROOT_DIR, "data", "edinet-codelist.json");

// ---- CSV parsing ----

/**
 * Parse a Shift-JIS CSV buffer into rows (each row is an array of cells).
 * Handles quoted fields and escaped double quotes. Empty trailing rows
 * are dropped.
 */
function parseCsv(buf) {
  const text = new TextDecoder("shift_jis").decode(buf);
  const lines = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\n") {
      row.push(field);
      lines.push(row);
      row = [];
      field = "";
      continue;
    }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    lines.push(row);
  }

  return lines.filter((r) => r.length > 1 || (r[0] && r[0].length > 0));
}

// ---- Field normalization ----

/**
 * Normalize the "上場区分" column to a stable enum:
 *   "listed"   — the filer is publicly listed
 *   "unlisted" — the filer is non-listed but files under EDINET
 *   "unknown"  — empty / unrecognised value
 */
function normalizeListingStatus(value) {
  if (!value) return "unknown";
  const v = value.trim();
  if (v.includes("非上場")) return "unlisted";
  if (v.includes("上場")) return "listed";
  return "unknown";
}

function parseCapital(value) {
  if (!value) return null;
  const n = Number(value.replace(/[^\d-]/g, ""));
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function cleanOrNull(value) {
  if (!value) return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

// ---- Main ----

async function main() {
  console.log(`📥  Downloading ${CODELIST_URL}`);
  const res = await fetch(CODELIST_URL);
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }
  const zipBuf = Buffer.from(await res.arrayBuffer());
  console.log(`    → ${zipBuf.length.toLocaleString()} bytes`);

  const workDir = mkdtempSync(join(tmpdir(), "edinet-codelist-"));
  const zipPath = join(workDir, "codelist.zip");
  writeFileSync(zipPath, zipBuf);

  console.log(`📦  Extracting via system unzip`);
  // execFileSync bypasses shell interpolation — safe for trusted mkdtemp paths.
  execFileSync("unzip", ["-o", zipPath, "-d", workDir], { stdio: "pipe" });

  const csvPath = join(workDir, "EdinetcodeDlInfo.csv");
  const csvBuf = readFileSync(csvPath);
  console.log(`📄  Parsing CSV (${csvBuf.length.toLocaleString()} bytes)`);

  const rows = parseCsv(csvBuf);
  // First row is metadata ("ダウンロード実行日,2026年…"), second is header.
  if (rows.length < 3) {
    throw new Error("Unexpected CSV layout: less than 3 rows");
  }
  const [meta, header, ...dataRows] = rows;
  console.log(`    → meta: ${meta.slice(0, 4).join(" | ")}`);
  console.log(`    → header: ${header.length} columns`);
  console.log(`    → data: ${dataRows.length.toLocaleString()} rows`);

  const idx = {
    edinetCode: header.indexOf("ＥＤＩＮＥＴコード"),
    submitterKind: header.indexOf("提出者種別"),
    listingStatus: header.indexOf("上場区分"),
    consolidated: header.indexOf("連結の有無"),
    capital: header.indexOf("資本金"),
    fiscalYearEnd: header.indexOf("決算日"),
    name: header.indexOf("提出者名"),
    nameEn: header.indexOf("提出者名（英字）"),
    nameKana: header.indexOf("提出者名（ヨミ）"),
    address: header.indexOf("所在地"),
    industry: header.indexOf("提出者業種"),
    secCode: header.indexOf("証券コード"),
    corporateNumber: header.indexOf("提出者法人番号"),
  };
  // Fallback: tolerate half-width paren variants in case the upstream export changes.
  if (idx.nameEn < 0) idx.nameEn = header.indexOf("提出者名(英字)");
  if (idx.nameKana < 0) idx.nameKana = header.indexOf("提出者名(ヨミ)");

  for (const [key, i] of Object.entries(idx)) {
    if (i < 0) {
      throw new Error(
        `CSV header missing column: ${key}\n  headers: ${header.join(" | ")}`,
      );
    }
  }

  // Project only the columns we need for unified-company lookups. Dropping
  // address / kana / en-name / submitter kind / consolidated / fiscal-year-end
  // keeps the committed JSON under ~3MB while preserving the data we
  // actually consume (id mapping, listed flag, fallback display name).
  const entries = [];
  for (const row of dataRows) {
    const edinetCode = cleanOrNull(row[idx.edinetCode]);
    if (!edinetCode) continue;
    const entry = {
      edinetCode,
      name: cleanOrNull(row[idx.name]) || "",
      listingStatus: normalizeListingStatus(row[idx.listingStatus]),
    };
    const corporateNumber = cleanOrNull(row[idx.corporateNumber]);
    if (corporateNumber) entry.corporateNumber = corporateNumber;
    const secCode = cleanOrNull(row[idx.secCode]);
    if (secCode) entry.secCode = secCode;
    const industry = cleanOrNull(row[idx.industry]);
    if (industry) entry.industry = industry;
    const capitalAmount = parseCapital(row[idx.capital]);
    if (capitalAmount != null) entry.capitalAmount = capitalAmount;
    entries.push(entry);
  }

  const listedCount = entries.filter((e) => e.listingStatus === "listed").length;
  const withJcn = entries.filter((e) => e.corporateNumber).length;
  console.log(
    `✔  Parsed ${entries.length.toLocaleString()} entries  ` +
      `(listed: ${listedCount.toLocaleString()}, with 法人番号: ${withJcn.toLocaleString()})`,
  );

  const payload = {
    source: CODELIST_URL,
    generatedAt: new Date().toISOString(),
    metaLine: meta.join(","),
    count: entries.length,
    entries,
  };

  // Minified (no indent) to keep the committed file under ~3MB.
  writeFileSync(OUTPUT_PATH, JSON.stringify(payload) + "\n", "utf8");
  console.log(`📝  Wrote ${OUTPUT_PATH}`);

  rmSync(workDir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
