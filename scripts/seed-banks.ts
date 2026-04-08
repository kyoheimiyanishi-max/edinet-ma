/**
 * Seed the d6e `banks` table from the curated `lib/banks.ts` BANKS array.
 *
 * Idempotent: existing rows (matched by name) are skipped.
 *
 * Run with:
 *   pnpm exec tsx --env-file=.env scripts/seed-banks.ts
 *
 * Requires `D6E_DEV_ACCESS_TOKEN` to be set with a valid JWT.
 */

import { BANKS } from "../lib/banks";
import { create, findAll, type BankInput } from "../lib/d6e/repos/banks";

async function main(): Promise<void> {
  console.log(`📥  Loading curated BANKS array (${BANKS.length} entries)`);

  const existing = await findAll();
  const existingNames = new Set(existing.map((b) => b.name));
  console.log(`📊  d6e currently has ${existing.length} banks`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const bank of BANKS) {
    if (existingNames.has(bank.name)) {
      skipped++;
      continue;
    }

    const input: BankInput = {
      name: bank.name,
      type: bank.type,
      description: bank.description,
      maServices: bank.maServices,
      ...(bank.prefecture ? { prefecture: bank.prefecture } : {}),
      ...(bank.url ? { url: bank.url } : {}),
      ...(bank.totalAssets ? { totalAssets: bank.totalAssets } : {}),
      ...(bank.maTeam ? { maTeam: bank.maTeam } : {}),
    };

    try {
      const created = await create(input);
      inserted++;
      console.log(`  ✅  ${created.name}  (${created.type})`);
    } catch (e) {
      failed++;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`  ❌  ${bank.name}  →  ${message}`);
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `inserted: ${inserted}  |  skipped (already exists): ${skipped}  |  failed: ${failed}`,
  );

  // Quick verify
  const after = await findAll();
  console.log(`d6e banks count after seed: ${after.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
