/**
 * Import buyer prospects from `20251108_買手開拓用シート.xlsx` (sheet
 * 開拓リスト) into the d6e `companies` table.
 *
 * Expects `/tmp/prospects.json` to be pre-generated from the Excel
 * file via the openpyxl extractor (see session log).
 *
 * Behavior:
 *   - For rows with 法人番号 (2,154 件) that ALREADY exist in companies
 *     (seeded from EDINET codelist): UPDATE is_buyer=true,
 *     is_prospect=true, append buyer attack state to notes, set website.
 *   - For rows with 法人番号 not found in companies: INSERT new row
 *     with is_buyer=true.
 *   - For rows WITHOUT 法人番号 (327 件): match by exact name.
 *     If exists, UPDATE; else INSERT.
 *
 * Idempotent: re-running is safe; already-marked is_buyer companies
 * get their notes refreshed (overwrite).
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env.local \
 *     scripts/import-buyer-prospects-excel.ts
 */

import { readFileSync } from "node:fs";
import {
  BUYER_PROSPECT_STATUSES,
  type BuyerProspectStatus,
  create as createCompany,
  findByCorporateNumber,
  search as searchCompanies,
  update as updateCompany,
  type CompanyInput,
} from "../lib/d6e/repos/companies";

interface ProspectRow {
  companyName: string;
  corporateNumber: string | null;
  url: string | null;
  status: string | null;
  approachDate: string | null;
  approachMethod: string | null;
  strongBuyerFlag: string | null;
  targetDeal: string | null;
  contactPerson: string | null;
  contactName: string | null;
  department: string | null;
  appointmentDate: string | null;
  ndaDate: string | null;
}

function toBuyerStatus(v: string | null): BuyerProspectStatus | undefined {
  if (!v) return undefined;
  if ((BUYER_PROSPECT_STATUSES as readonly string[]).includes(v)) {
    return v as BuyerProspectStatus;
  }
  return undefined;
}

function toBool(v: string | null): boolean {
  if (!v) return false;
  return /●|○|◯|有|Strong|true|yes/i.test(v);
}

/** 構造化カラムに入らない補足情報だけ notes にまとめる */
function buildNotes(p: ProspectRow): string {
  const lines: string[] = [];
  if (p.contactPerson) lines.push(`連絡担当者: ${p.contactPerson}`);
  if (p.contactName || p.department) {
    lines.push(
      `先方担当: ${[p.contactName, p.department].filter(Boolean).join(" / ")}`,
    );
  }
  if (p.appointmentDate) lines.push(`アポイント日: ${p.appointmentDate}`);
  return lines.length > 0 ? "## 買手開拓\n" + lines.join("\n") : "";
}

function sanitizeUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

async function main(): Promise<void> {
  const raw = readFileSync("/tmp/prospects.json", "utf-8");
  const prospects = JSON.parse(raw) as ProspectRow[];
  console.log(`📥  Loaded ${prospects.length} buyer prospects`);

  let updated = 0;
  let inserted = 0;
  const skipped = 0;
  let failed = 0;

  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i];
    if (!p) continue;

    const notes = buildNotes(p);
    const website = sanitizeUrl(p.url);

    try {
      // 1) 法人番号があれば既存行を引き当て
      let existingId: string | null = null;
      if (p.corporateNumber) {
        const hit = await findByCorporateNumber(p.corporateNumber);
        if (hit) existingId = hit.id;
      } else {
        // 法人番号無い場合は企業名で検索 (limit 5 で top hit を使う)
        const matches = await searchCompanies({
          query: p.companyName,
          limit: 5,
        });
        const exact = matches.find((m) => m.name === p.companyName);
        if (exact) existingId = exact.id;
      }

      const buyerStatus = toBuyerStatus(p.status);
      const structured: Partial<CompanyInput> = {
        isBuyer: true,
        isProspect: true,
        strongBuyer: toBool(p.strongBuyerFlag),
        ...(buyerStatus ? { buyerStatus } : {}),
        ...(p.targetDeal ? { targetDeal: p.targetDeal } : {}),
        ...(p.approachDate ? { lastApproachDate: p.approachDate } : {}),
        ...(p.approachMethod ? { lastApproachMethod: p.approachMethod } : {}),
        ...(p.ndaDate ? { ndaDate: p.ndaDate } : {}),
        ...(p.contactPerson ? { buyerAssignedTo: p.contactPerson } : {}),
      };

      if (existingId) {
        const patch: Partial<CompanyInput> = {
          ...structured,
          ...(notes ? { notes } : {}),
          ...(website ? { website } : {}),
        };
        await updateCompany(existingId, patch);
        updated++;
      } else {
        // 新規作成: 法人番号があれば入れる、無ければ名前のみ
        const input: CompanyInput = {
          name: p.companyName,
          ...structured,
          ...(notes ? { notes } : {}),
          ...(p.corporateNumber ? { corporateNumber: p.corporateNumber } : {}),
          ...(website ? { website } : {}),
        };
        await createCompany(input);
        inserted++;
      }
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ❌ ${p.companyName}: ${msg.slice(0, 150)}`);
    }

    if ((i + 1) % 100 === 0) {
      console.log(
        `  … progress ${i + 1}/${prospects.length} (updated=${updated} inserted=${inserted} failed=${failed})`,
      );
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `updated: ${updated}  |  inserted: ${inserted}  |  skipped: ${skipped}  |  failed: ${failed}`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
