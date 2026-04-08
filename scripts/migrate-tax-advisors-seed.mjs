// One-shot: dump ADVISORS from lib/tax-advisors.ts to data/tax-advisors.json
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const { ADVISORS } = await import(join(rootDir, "lib/tax-advisors.ts"));

const out = join(rootDir, "data/tax-advisors.json");
writeFileSync(out, JSON.stringify(ADVISORS, null, 2) + "\n", "utf8");
console.log(`Wrote ${ADVISORS.length} entries to ${out}`);
