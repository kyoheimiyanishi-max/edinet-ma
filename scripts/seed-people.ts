/**
 * Seed the d6e `ma_people` table from the curated `lib/people.ts` MA_PEOPLE
 * array (loaded from data/people.json).
 *
 * Idempotent: existing rows matched by name are skipped.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-people.ts
 */

import { MA_PEOPLE } from "../lib/people";
import { create, findAll, type PersonInput } from "../lib/d6e/repos/people";

async function main(): Promise<void> {
  console.log(`📥  Loading MA_PEOPLE (${MA_PEOPLE.length} entries)`);

  const existing = await findAll();
  const existingNames = new Set(existing.map((p) => p.name));
  console.log(`📊  d6e currently has ${existing.length} people`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const person of MA_PEOPLE) {
    if (existingNames.has(person.name)) {
      skipped++;
      continue;
    }

    const input: PersonInput = {
      name: person.name,
      ...(person.nameEn ? { nameEn: person.nameEn } : {}),
      role: person.role,
      organization: person.organization,
      description: person.description,
      category: person.category,
      notableDeals: person.notableDeals,
      links: person.links,
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
      console.error(`  ❌  ${person.name}  →  ${message}`);
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `inserted: ${inserted}  |  skipped (already exists): ${skipped}  |  failed: ${failed}`,
  );

  const after = await findAll();
  console.log(`d6e ma_people count after seed: ${after.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
