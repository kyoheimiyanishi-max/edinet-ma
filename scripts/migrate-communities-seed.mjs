// One-shot: dump COMMUNITIES from lib/communities.ts to data/communities.json
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const { COMMUNITIES } = await import(join(rootDir, "lib/communities.ts"));

const out = join(rootDir, "data/communities.json");
writeFileSync(out, JSON.stringify(COMMUNITIES, null, 2) + "\n", "utf8");
console.log(`Wrote ${COMMUNITIES.length} entries to ${out}`);
