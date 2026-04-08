import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { D6E_API_URL } from "./config";

/**
 * Dev-only access token lifecycle for the d6e-api.
 *
 * Responsibilities:
 *   1. Read the initial refresh (and optional access) token from env.
 *   2. Call the d6e refresh endpoint automatically before expiry.
 *   3. Persist the rotated refresh token so server restarts can resume.
 *   4. Single-flight refreshes so concurrent requests share one call.
 *
 * This replaces the previous "paste a fresh JWT every hour" workflow.
 * Production should replace this with a proper OAuth callback flow.
 *
 * Refresh protocol (reverse-engineered from d6e-frontend auth chunk):
 *   POST {D6E_API_URL}/api/v1/auth/token
 *   body: { grant_type: "refresh_token", refresh_token }
 *   response: { access_token, refresh_token, expires_in }
 *
 * Note that the refresh token rotates on every call — the old value
 * becomes invalid and must be replaced with the new one. We persist to
 * `.next/cache/d6e-dev-tokens.json` so restarts don't lose the chain.
 */

interface TokenState {
  accessToken: string;
  refreshToken: string;
  /** Epoch seconds. Includes a safety buffer applied at write time. */
  expiresAt: number;
}

const CACHE_FILE = ".next/cache/d6e-dev-tokens.json";
const SAFETY_BUFFER_SECONDS = 60;
const PRE_REFRESH_WINDOW_SECONDS = 30;

let cached: TokenState | null = null;
let inflightRefresh: Promise<TokenState> | null = null;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function decodeExp(jwt: string): number | null {
  try {
    const payloadBase64 = jwt.split(".")[1];
    if (!payloadBase64) return null;
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString(),
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

async function readCacheFile(): Promise<TokenState | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TokenState>;
    if (
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      return parsed as TokenState;
    }
  } catch {
    // missing or invalid — fall through
  }
  return null;
}

async function writeCacheFile(state: TokenState): Promise<void> {
  try {
    await mkdir(dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    // non-fatal; the next refresh will try again
  }
}

async function callRefresh(refreshToken: string): Promise<TokenState> {
  const response = await fetch(`${D6E_API_URL}/api/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(
      `d6e refresh failed (HTTP ${response.status}): ${bodyText.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token || !data.refresh_token) {
    throw new Error(
      "d6e refresh response missing access_token or refresh_token",
    );
  }

  const expiresIn = data.expires_in ?? 3600;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: nowSeconds() + expiresIn - SAFETY_BUFFER_SECONDS,
  };
}

async function bootstrapFromEnv(): Promise<TokenState | null> {
  const envAccess = process.env.D6E_DEV_ACCESS_TOKEN;
  const envRefresh = process.env.D6E_DEV_REFRESH_TOKEN;

  if (envRefresh) {
    // Preferred path: call refresh immediately to obtain a verified pair.
    const fresh = await callRefresh(envRefresh);
    await writeCacheFile(fresh);
    return fresh;
  }

  if (envAccess) {
    // Legacy path: only the access token is available. Use it until it
    // expires, then fail loudly so the developer knows to add a refresh
    // token.
    const exp = decodeExp(envAccess) ?? nowSeconds() + 300;
    return {
      accessToken: envAccess,
      refreshToken: "",
      expiresAt: exp - SAFETY_BUFFER_SECONDS,
    };
  }

  return null;
}

async function refreshIfNeeded(): Promise<TokenState> {
  const now = nowSeconds();

  // In-process cache still valid.
  if (cached && cached.expiresAt > now + PRE_REFRESH_WINDOW_SECONDS) {
    return cached;
  }

  // Single-flight: concurrent callers share one refresh.
  if (inflightRefresh) {
    return inflightRefresh;
  }

  inflightRefresh = (async () => {
    try {
      // Reload from file in case another process refreshed.
      if (!cached) {
        const fromFile = await readCacheFile();
        if (fromFile && fromFile.expiresAt > now + PRE_REFRESH_WINDOW_SECONDS) {
          cached = fromFile;
          return fromFile;
        }
        if (fromFile) {
          // File cache exists but is expired — use its refresh token.
          cached = fromFile;
        }
      }

      // Decide which refresh token to use.
      const refreshToken =
        (cached && cached.refreshToken) ||
        process.env.D6E_DEV_REFRESH_TOKEN ||
        "";

      if (!refreshToken) {
        // No refresh token anywhere. Try env bootstrap (might succeed
        // if the user just added D6E_DEV_ACCESS_TOKEN in legacy mode).
        const bootstrapped = await bootstrapFromEnv();
        if (bootstrapped) {
          cached = bootstrapped;
          return bootstrapped;
        }
        throw new Error(
          "d6e access token expired and no refresh token available. " +
            "Set D6E_DEV_REFRESH_TOKEN in .env (paste the 'auth-refresh' cookie " +
            "from https://jp-force.d6e.ai in Chrome DevTools → Cookies).",
        );
      }

      const fresh = await callRefresh(refreshToken);
      cached = fresh;
      await writeCacheFile(fresh);
      return fresh;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

/**
 * Get a valid access token, refreshing if needed. Callers should not
 * cache the returned string across awaits — each call ensures freshness.
 *
 * An explicit override (e.g. a user-scoped token passed from a Route
 * Handler) bypasses the dev-token machinery entirely.
 */
export async function getAccessToken(override?: string): Promise<string> {
  if (override) return override;

  // Cold start: try file cache → env bootstrap.
  if (!cached) {
    const fromFile = await readCacheFile();
    if (fromFile) {
      cached = fromFile;
    } else {
      const bootstrapped = await bootstrapFromEnv();
      if (bootstrapped) cached = bootstrapped;
    }
  }

  const state = await refreshIfNeeded();
  return state.accessToken;
}
