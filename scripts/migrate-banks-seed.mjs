// One-shot: dump BANKS from lib/banks.ts to data/banks.json
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const { BANKS } = await import(join(rootDir, "lib/banks.ts"));

const out = join(rootDir, "data/banks.json");
writeFileSync(out, JSON.stringify(BANKS, null, 2) + "\n", "utf8");
console.log(`Wrote ${BANKS.length} entries to ${out}`);
