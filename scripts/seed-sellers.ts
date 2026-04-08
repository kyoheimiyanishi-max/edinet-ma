/**
 * Migrate sellers (with nested minutes/documents/buyers) from
 * data/sellers.json to d6e.
 *
 * Preserves the original UUIDs so project.seller_id cross-references
 * resolve. After seeding, re-links any projects whose seller_id was
 * set NULL during the earlier admin seed.
 *
 * Idempotent: existing rows (by id) are skipped.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-sellers.ts
 */

import sellersData from "../data/sellers.json";
import projectsData from "../data/projects.json";

import { executeSql } from "../lib/d6e/client";
import { escapeSqlValue, tableRef } from "../lib/d6e/sql";
import type { Seller } from "../lib/sellers";
import type { Project } from "../lib/projects";

interface ExistsRow {
  n: number;
}

async function tableHasId(table: string, id: string): Promise<boolean> {
  const result = await executeSql<ExistsRow>(
    `SELECT count(*)::int as n FROM ${tableRef(table)} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.rows?.[0]?.n ?? 0) > 0;
}

async function insertSeller(seller: Seller): Promise<void> {
  await executeSql(
    `INSERT INTO ${tableRef("sellers")}
       (id, company_name, industry, prefecture, description, profile, desired_terms, stage)
     VALUES (
       ${escapeSqlValue(seller.id)},
       ${escapeSqlValue(seller.companyName)},
       ${escapeSqlValue(seller.industry)},
       ${escapeSqlValue(seller.prefecture)},
       ${escapeSqlValue(seller.description)},
       ${escapeSqlValue(seller.profile)},
       ${escapeSqlValue(seller.desiredTerms)},
       ${escapeSqlValue(seller.stage)}
     )`,
  );

  // Batch-insert nested sub-rows in at most 3 multi-row statements
  // (one per sub-table) instead of per-row awaits.
  const minutes = seller.minutes ?? [];
  if (minutes.length > 0) {
    const values = minutes
      .map(
        (m) =>
          `(
            ${escapeSqlValue(m.id)},
            ${escapeSqlValue(seller.id)},
            ${escapeSqlValue(m.title)},
            ${escapeSqlValue(m.date)},
            ${escapeSqlValue(m.participants, "ARRAY", "_text")},
            ${escapeSqlValue(m.content)},
            ${escapeSqlValue(m.createdAt)}
          )`,
      )
      .join(", ");
    await executeSql(
      `INSERT INTO ${tableRef("meeting_minutes")}
         (id, seller_id, title, meeting_date, attendees, content, created_at)
       VALUES ${values}`,
    );
  }

  const documents = seller.documents ?? [];
  if (documents.length > 0) {
    const values = documents
      .map(
        (d) =>
          `(
            ${escapeSqlValue(d.id)},
            ${escapeSqlValue(seller.id)},
            ${escapeSqlValue(d.title)},
            ${escapeSqlValue(d.content)},
            ${escapeSqlValue(d.uploadedAt)}
          )`,
      )
      .join(", ");
    await executeSql(
      `INSERT INTO ${tableRef("seller_documents")}
         (id, seller_id, title, content, uploaded_at)
       VALUES ${values}`,
    );
  }

  const buyers = seller.buyers ?? [];
  if (buyers.length > 0) {
    const values = buyers
      .map(
        (b) =>
          `(
            ${escapeSqlValue(b.id)},
            ${escapeSqlValue(seller.id)},
            ${escapeSqlValue(b.companyCode)},
            ${escapeSqlValue(b.companyName)},
            ${escapeSqlValue(b.industry)},
            ${escapeSqlValue(b.source)},
            ${escapeSqlValue(b.reasoning)},
            ${escapeSqlValue(b.status)},
            ${escapeSqlValue(b.addedAt)},
            ${escapeSqlValue(b.updatedAt)}
          )`,
      )
      .join(", ");
    await executeSql(
      `INSERT INTO ${tableRef("seller_buyer_candidates")}
         (id, seller_id, company_code, company_name, industry, source, reasoning, status, added_at, updated_at)
       VALUES ${values}`,
    );
  }
}

async function seedSellers(): Promise<void> {
  const sellers = sellersData as Seller[];
  console.log(`📥  sellers: ${sellers.length} entries`);
  for (const s of sellers) {
    if (await tableHasId("sellers", s.id)) {
      console.log(`  ⏭  skip ${s.companyName} (${s.id})`);
      continue;
    }
    await insertSeller(s);
    console.log(
      `  ✅  ${s.companyName}  (${s.minutes?.length ?? 0} minutes, ${s.documents?.length ?? 0} docs, ${s.buyers?.length ?? 0} buyers)`,
    );
  }
}

async function relinkProjects(): Promise<void> {
  const projects = projectsData as Project[];
  console.log(`\n🔗  relinking ${projects.length} projects with seller_id`);
  for (const p of projects) {
    if (!p.sellerId) continue;
    const exists = await tableHasId("sellers", p.sellerId);
    if (!exists) {
      console.log(
        `  ⚠  project ${p.name} references missing seller ${p.sellerId}`,
      );
      continue;
    }
    await executeSql(
      `UPDATE ${tableRef("projects")}
       SET seller_id = ${escapeSqlValue(p.sellerId)}, updated_at = now()
       WHERE id = ${escapeSqlValue(p.id)}`,
    );
    console.log(`  ✅  ${p.name} → seller ${p.sellerId}`);
  }
}

async function main(): Promise<void> {
  await seedSellers();
  await relinkProjects();

  console.log("\n=== final counts ===");
  for (const t of [
    "sellers",
    "meeting_minutes",
    "seller_documents",
    "seller_buyer_candidates",
  ]) {
    const r = await executeSql<ExistsRow>(
      `SELECT count(*)::int as n FROM ${tableRef(t)}`,
    );
    console.log(`  ${t.padEnd(26)} ${r.rows?.[0]?.n ?? "?"}`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
