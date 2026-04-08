// One-shot: dump MA_PEOPLE from lib/people.ts to data/people.json
// Usage: node --experimental-strip-types scripts/migrate-seed.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const { MA_PEOPLE } = await import(join(rootDir, "lib/people.ts"));

const out = join(rootDir, "data/people.json");
writeFileSync(out, JSON.stringify(MA_PEOPLE, null, 2) + "\n", "utf8");
console.log(`Wrote ${MA_PEOPLE.length} entries to ${out}`);
