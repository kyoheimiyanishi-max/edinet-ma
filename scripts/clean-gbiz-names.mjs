// gBizINFO 由来エントリの name フィールドから役職を切り出す one-shot
// 「代表取締役社長　　関　口    明」→ role: "代表取締役社長", name: "関口明"
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data/people.json");

const ROLE_PATTERNS = [
  "代表取締役会長兼社長",
  "代表取締役会長兼CEO",
  "代表取締役社長兼CEO",
  "代表取締役会長",
  "代表取締役社長",
  "代表取締役副社長",
  "代表取締役",
  "代表執行役社長",
  "代表執行役会長",
  "代表執行役",
  "代表理事",
  "理事長",
  "取締役会長",
  "取締役社長",
  "代表者",
];

function splitRoleAndName(raw) {
  const compact = raw.replace(/[\s\u3000]+/g, " ").trim();
  for (const role of ROLE_PATTERNS) {
    if (compact.startsWith(role)) {
      const rest = compact
        .slice(role.length)
        .replace(/[\s\u3000]+/g, "")
        .trim();
      if (rest) return { role, name: rest };
    }
  }
  return { role: null, name: compact.replace(/[\s\u3000]+/g, "") };
}

const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
let touched = 0;
let dropped = 0;
const out = [];
const seenNames = new Set();
for (const p of data) {
  if (!p.id?.startsWith("gbiz:")) {
    const k = p.name.replace(/[\s\u3000]+/g, "");
    if (seenNames.has(k)) {
      dropped++;
      continue;
    }
    seenNames.add(k);
    out.push(p);
    continue;
  }
  const { role, name } = splitRoleAndName(p.name);
  if (!name || name.length > 30) {
    dropped++;
    continue;
  }
  const key = name.replace(/[\s\u3000]+/g, "");
  if (seenNames.has(key)) {
    dropped++;
    continue;
  }
  seenNames.add(key);
  if (role && role !== p.role) {
    p.role = role;
    p.name = name;
    touched++;
  } else if (name !== p.name) {
    p.name = name;
    touched++;
  }
  out.push(p);
}
writeFileSync(DATA_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`cleaned: ${touched} entries, dropped: ${dropped}, total: ${out.length}`);
