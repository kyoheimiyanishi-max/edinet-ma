/**
 * Seed the d6e `tax_advisors` table from the curated `lib/tax-advisors.ts`
 * ADVISORS array.
 *
 * Idempotent: existing rows (matched by name) are skipped.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-tax-advisors.ts
 */

import { ADVISORS } from "../lib/tax-advisors";
import {
  create,
  findAll,
  type TaxAdvisorInput,
} from "../lib/d6e/repos/tax-advisors";

async function main(): Promise<void> {
  console.log(
    `📥  Loading curated ADVISORS array (${ADVISORS.length} entries)`,
  );

  const existing = await findAll();
  const existingNames = new Set(existing.map((a) => a.name));
  console.log(`📊  d6e currently has ${existing.length} tax advisors`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const advisor of ADVISORS) {
    if (existingNames.has(advisor.name)) {
      skipped++;
      continue;
    }

    const input: TaxAdvisorInput = {
      name: advisor.name,
      type: advisor.type,
      description: advisor.description,
      specialties: advisor.specialties,
      ...(advisor.prefecture ? { prefecture: advisor.prefecture } : {}),
      ...(advisor.url ? { url: advisor.url } : {}),
      ...(advisor.size ? { size: advisor.size } : {}),
      ...(advisor.notableServices
        ? { notableServices: advisor.notableServices }
        : {}),
    };

    try {
      const created = await create(input);
      inserted++;
      console.log(`  ✅  ${created.name}  (${created.type})`);
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`  ❌  ${advisor.name}  →  ${message}`);
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `inserted: ${inserted}  |  skipped (already exists): ${skipped}  |  failed: ${failed}`,
  );

  const after = await findAll();
  console.log(`d6e tax_advisors count after seed: ${after.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
