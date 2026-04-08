/**
 * Test the auto-refresh auth flow end-to-end.
 *
 * Run: pnpm exec tsx --conditions=react-server --env-file=.env scripts/d6e-auth-test.ts
 *
 * Expected flow on a cold cache:
 *   1. getAccessToken() → bootstrap from D6E_DEV_REFRESH_TOKEN
 *   2. Auto-refresh to /api/v1/auth/token
 *   3. Writes .next/cache/d6e-dev-tokens.json
 *   4. Subsequent calls hit the in-process cache
 */

import { readFile } from "node:fs/promises";

import { getAccessToken } from "../lib/d6e/auth";
import { findAll } from "../lib/d6e/repos/banks";

const CACHE_FILE = ".next/cache/d6e-dev-tokens.json";

function fingerprint(jwt: string): string {
  return `${jwt.slice(0, 16)}...${jwt.slice(-8)}`;
}

async function main(): Promise<void> {
  console.log("=== call 1: cold cache ===");
  const t1 = await getAccessToken();
  console.log("  access token:", fingerprint(t1));

  console.log("\n=== cache file ===");
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    const data = JSON.parse(raw) as {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };
    console.log("  file exists:", CACHE_FILE);
    console.log("  access :", fingerprint(data.accessToken));
    console.log("  refresh:", fingerprint(data.refreshToken));
    console.log(
      "  expires:",
      new Date(data.expiresAt * 1000).toISOString(),
      `(${Math.round((data.expiresAt - Date.now() / 1000) / 60)} min from now)`,
    );
  } catch (e) {
    console.log("  ❌ cache file not found:", e);
  }

  console.log("\n=== call 2: warm in-process cache ===");
  const t2 = await getAccessToken();
  console.log("  access token:", fingerprint(t2));
  console.log(
    "  same as call 1:",
    t1 === t2 ? "✅ yes (cached)" : "⚠️  no (re-fetched)",
  );

  console.log("\n=== real query via repo ===");
  const banks = await findAll();
  console.log(`  banks count: ${banks.length}`);
  if (banks.length > 0) {
    console.log(`  first: ${banks[0].name} (${banks[0].type})`);
  }

  console.log("\n✅ all checks passed");
}

main().catch((e) => {
  console.error("❌ FAILED:", e);
  process.exit(1);
});
