/**
 * Seed the d6e `ma_advisors` table from `lib/ma-advisors.ts` MA_ADVISORS
 * (loaded from the data/ma-advisors.json dataset).
 *
 * Idempotent: existing rows matched by name are skipped.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-ma-advisors.ts
 */

import { MA_ADVISORS } from "../lib/ma-advisors";
import {
  create,
  findAll,
  type MaAdvisorInput,
} from "../lib/d6e/repos/ma-advisors";

async function main(): Promise<void> {
  console.log(`📥  Loading MA_ADVISORS (${MA_ADVISORS.length} entries)`);

  const existing = await findAll();
  const existingNames = new Set(existing.map((a) => a.name));
  console.log(`📊  d6e currently has ${existing.length} ma advisors`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const a of MA_ADVISORS) {
    if (existingNames.has(a.name)) {
      skipped++;
      continue;
    }

    const input: MaAdvisorInput = {
      name: a.name,
      type: a.type,
      description: a.description,
      services: a.services,
      ...(a.prefecture ? { prefecture: a.prefecture } : {}),
      ...(a.url ? { url: a.url } : {}),
      ...(a.listed !== undefined ? { listed: a.listed } : {}),
      ...(a.targetSize ? { targetSize: a.targetSize } : {}),
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
      console.error(`  ❌  ${a.name}  →  ${message.slice(0, 120)}`);
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `inserted: ${inserted}  |  skipped: ${skipped}  |  failed: ${failed}`,
  );

  const after = await findAll();
  console.log(`d6e ma_advisors total: ${after.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
