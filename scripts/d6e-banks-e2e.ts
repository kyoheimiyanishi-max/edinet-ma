/**
 * End-to-end smoke test for the d6e banks repository.
 * Calls every public read function and prints results.
 *
 * Run: pnpm exec tsx --conditions=react-server --env-file=.env scripts/d6e-banks-e2e.ts
 */

import {
  findAll,
  search,
  getAllTypes,
  getAllMaServices,
  getAllPrefectures,
} from "../lib/d6e/repos/banks";

async function main(): Promise<void> {
  const all = await findAll();
  console.log(`✅ findAll()                      → ${all.length} banks`);

  const megaBanks = await search({ type: "メガバンク" });
  console.log(
    `✅ search({type:'メガバンク'})        → ${megaBanks.length} banks`,
  );

  const tokyoBanks = await search({ prefecture: "東京都" });
  console.log(
    `✅ search({prefecture:'東京都'})       → ${tokyoBanks.length} banks`,
  );

  const kw = await search({ query: "M&Aアドバイザリー" });
  console.log(`✅ search({query:'M&Aアドバイザリー'})  → ${kw.length} banks`);

  const types = await getAllTypes();
  console.log(`✅ getAllTypes()                  → [${types.join(", ")}]`);

  const services = await getAllMaServices();
  console.log(
    `✅ getAllMaServices()             → ${services.length} unique services`,
  );

  const prefs = await getAllPrefectures();
  console.log(
    `✅ getAllPrefectures()            → ${prefs.length} prefectures`,
  );

  console.log("\n=== sample row mapped to edinet-ma Bank ===");
  console.log(JSON.stringify(all[0], null, 2));
}

main().catch((e) => {
  console.error("❌ FAILED:", e);
  process.exit(1);
});
