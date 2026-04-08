/**
 * Seed the d6e `ceo_communities` table from the curated `lib/communities.ts`
 * COMMUNITIES array (loaded from data/communities.json).
 *
 * Idempotent: existing rows matched by name are skipped.
 *
 * Run with:
 *   pnpm exec tsx --conditions=react-server --env-file=.env scripts/seed-communities.ts
 */

import { COMMUNITIES } from "../lib/communities";
import {
  create,
  findAll,
  type CommunityInput,
} from "../lib/d6e/repos/communities";

async function main(): Promise<void> {
  console.log(`📥  Loading COMMUNITIES (${COMMUNITIES.length} entries)`);

  const existing = await findAll();
  const existingNames = new Set(existing.map((c) => c.name));
  console.log(`📊  d6e currently has ${existing.length} communities`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const community of COMMUNITIES) {
    if (existingNames.has(community.name)) {
      skipped++;
      continue;
    }

    const input: CommunityInput = {
      name: community.name,
      description: community.description,
      ...(community.url ? { url: community.url } : {}),
      ...(community.prefecture ? { prefecture: community.prefecture } : {}),
      type: community.type,
      ...(community.memberCount !== undefined
        ? { memberCount: community.memberCount }
        : {}),
      focusAreas: community.focusAreas,
      ...(community.established !== undefined
        ? { established: community.established }
        : {}),
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
      console.error(`  ❌  ${community.name}  →  ${message}`);
    }
  }

  console.log("");
  console.log("─".repeat(60));
  console.log(
    `inserted: ${inserted}  |  skipped (already exists): ${skipped}  |  failed: ${failed}`,
  );

  const after = await findAll();
  console.log(`d6e ceo_communities count after seed: ${after.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
