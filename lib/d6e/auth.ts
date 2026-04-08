import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { D6E_API_URL } from "./config";

/**
 * Access token lifecycle for the d6e-api.
 *
 * Responsibilities:
 *   1. Read the initial refresh (and optional access) token from env.
 *   2. Call the d6e refresh endpoint automatically before expiry.
 *   3. Persist the rotated refresh token so server restarts can resume.
 *   4. Single-flight refreshes so concurrent requests share one call.
 *
 * Refresh protocol (reverse-engineered from d6e-frontend auth chunk):
 *   POST {D6E_API_URL}/api/v1/auth/token
 *   body: { grant_type: "refresh_token", refresh_token }
 *   response: { access_token, refresh_token, expires_in }
 *
 * d6e の refresh token は 1 回使うとローテート（元の値は無効化）される。
 * そのため環境ごとに持続的な動作モードが異なる:
 *
 *   - ローカル開発 (dev):
 *       `.next/cache/d6e-dev-tokens.json` に新しい refresh token を
 *       書き戻して次回以降も回せる。D6E_DEV_REFRESH_TOKEN があればそれを
 *       初期シードとして使い、以降はファイルを優先する。
 *
 *   - Vercel サーバレス (prod/preview):
 *       ファイルシステムは揮発・共有不可で refresh token のローテートが
 *       Lambda インスタンス間で競合するため、refresh フローは使わず、
 *       `D6E_DEV_ACCESS_TOKEN` を直接 (in-memory) 使うモードで動く。
 *       アクセストークンが失効したら 401 が返るので、Vercel の env を
 *       手動更新するか、後日 KV 系ストア (Upstash Redis / Vercel Blob
 *       等) を導入してローテート対応を追加する必要がある。
 */

const IS_VERCEL = !!process.env.VERCEL;

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
  if (IS_VERCEL) return null; // サーバレスでは使わない
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
  if (IS_VERCEL) return; // サーバレスでは永続化しない
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

  // Vercel サーバレスでは refresh ローテートが Lambda 間競合を起こす
  // ため、ACCESS_TOKEN が設定されていればそちらを優先する (REFRESH は無視)。
  if (IS_VERCEL && envAccess) {
    const exp = decodeExp(envAccess);
    if (exp === null) {
      console.error(
        "[d6e-auth] D6E_DEV_ACCESS_TOKEN is set but its `exp` claim " +
          "could not be decoded. Check that the token is a valid JWT.",
      );
      return null;
    }
    return {
      accessToken: envAccess,
      refreshToken: "",
      expiresAt: exp - SAFETY_BUFFER_SECONDS,
    };
  }

  if (envRefresh) {
    // Preferred path: call refresh immediately to obtain a verified pair.
    const fresh = await callRefresh(envRefresh);
    await writeCacheFile(fresh);
    return fresh;
  }

  if (envAccess) {
    // Legacy path: only the access token is available. Use it until
    // it expires, then fail loudly so the developer knows to add a
    // refresh token. If the exp claim cannot be decoded the token is
    // malformed — refuse to bootstrap rather than silently granting a
    // 5-minute lifetime.
    const exp = decodeExp(envAccess);
    if (exp === null) {
      console.error(
        "[d6e-auth] D6E_DEV_ACCESS_TOKEN is set but its `exp` claim " +
          "could not be decoded. Refusing to bootstrap — please paste a " +
          "fresh JWT or set D6E_DEV_REFRESH_TOKEN instead.",
      );
      return null;
    }
    console.warn(
      "[d6e-auth] Running in legacy access-token mode. This token will " +
        "expire and cannot be refreshed automatically; set " +
        "D6E_DEV_REFRESH_TOKEN for persistent dev sessions.",
    );
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
      // Reload from file in case another process refreshed. Single
      // file read: the result is used both to short-circuit (if still
      // valid) and as the source of the refresh token (if expired).
      if (!cached) {
        const fromFile = await readCacheFile();
        if (fromFile) {
          cached = fromFile;
          if (fromFile.expiresAt > now + PRE_REFRESH_WINDOW_SECONDS) {
            return fromFile;
          }
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
