/**
 * Seed the d6e `ma_deals` table from data/deals.json.
 *
 * Idempotent: dedupes against existing rows by (buyer, target, date).
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-ma-deals.ts
 */

import dealsData from "../data/deals.json";

import {
  create,
  findByNaturalKey,
  type MaDealInput,
} from "../lib/d6e/repos/ma-deals";
import type { Deal } from "../lib/deals";

async function main(): Promise<void> {
  const deals = dealsData as Deal[];
  console.log(`📥  Loading deals.json (${deals.length} entries)`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const deal of deals) {
    const existing = await findByNaturalKey(deal.buyer, deal.target, deal.date);
    if (existing) {
      skipped++;
      console.log(`  ⏭  ${deal.buyer} → ${deal.target} (${deal.date})`);
      continue;
    }

    const input: MaDealInput = {
      date: deal.date,
      buyer: deal.buyer,
      target: deal.target,
      amount: deal.amount,
      currency: deal.currency,
      category: deal.category,
      status: deal.status,
      summary: deal.summary,
    };

    try {
      const created = await create(input);
      inserted++;
      console.log(
        `  ✅  ${created.buyer} → ${created.target}  (${created.date}, ${created.status})`,
      );
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(
        `  ❌  ${deal.buyer} → ${deal.target}  →  ${message.slice(0, 120)}`,
      );
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `inserted: ${inserted}  |  skipped (already exists): ${skipped}  |  failed: ${failed}`,
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
