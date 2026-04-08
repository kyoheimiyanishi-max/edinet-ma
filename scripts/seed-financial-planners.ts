/**
 * Seed the d6e `financial_planners` table from
 * `lib/financial-planners.ts` FINANCIAL_PLANNERS (loaded from the
 * data/financial-planners.json dataset).
 *
 * Idempotent: existing rows matched by name are skipped.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-financial-planners.ts
 */

import { FINANCIAL_PLANNERS } from "../lib/financial-planners";
import {
  create,
  findAll,
  type FinancialPlannerInput,
} from "../lib/d6e/repos/financial-planners";

async function main(): Promise<void> {
  console.log(
    `📥  Loading FINANCIAL_PLANNERS (${FINANCIAL_PLANNERS.length} entries)`,
  );

  const existing = await findAll();
  const existingNames = new Set(existing.map((p) => p.name));
  console.log(`📊  d6e currently has ${existing.length} financial planners`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of FINANCIAL_PLANNERS) {
    if (existingNames.has(p.name)) {
      skipped++;
      continue;
    }

    const input: FinancialPlannerInput = {
      name: p.name,
      type: p.type,
      description: p.description,
      services: p.services,
      ...(p.certifications ? { certifications: p.certifications } : {}),
      ...(p.targetClients ? { targetClients: p.targetClients } : {}),
      ...(p.prefecture ? { prefecture: p.prefecture } : {}),
      ...(p.url ? { url: p.url } : {}),
      ...(p.listed !== undefined ? { listed: p.listed } : {}),
    };

    try {
      const created = await create(input);
      inserted++;
      if (inserted % 100 === 0) {
        console.log(`  … ${inserted} inserted (latest: ${created.name})`);
      }
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`  ❌  ${p.name}  →  ${message.slice(0, 120)}`);
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `inserted: ${inserted}  |  skipped: ${skipped}  |  failed: ${failed}`,
  );

  const after = await findAll();
  console.log(`d6e financial_planners total: ${after.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
