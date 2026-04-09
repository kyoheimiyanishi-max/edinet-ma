import "server-only";

import { D6E_API_URL } from "./config";
import { getTokenStore, type TokenState } from "./token-store";

/**
 * Access token lifecycle for the d6e-api.
 *
 * Responsibilities:
 *   1. Read the initial refresh (and optional access) token from env.
 *   2. Call the d6e refresh endpoint automatically before expiry.
 *   3. Persist the rotated refresh token through a pluggable TokenStore
 *      so server restarts / serverless cold starts can resume.
 *   4. Single-flight refreshes via in-memory gate + (on Vercel) a Redis
 *      SET NX lock so concurrent Lambda instances share one refresh.
 *
 * Refresh protocol (reverse-engineered from d6e-frontend auth chunk):
 *   POST {D6E_API_URL}/api/v1/auth/token
 *   body: { grant_type: "refresh_token", refresh_token }
 *   response: { access_token, refresh_token, expires_in }
 *
 * d6e の refresh token は使い捨て回転型 (1 回使うと無効化される) な
 * ので、複数プロセス / 複数 Lambda インスタンス間でも「誰か 1 人だけ
 * refresh を呼び、他は待つ」ような協調が必要。分散ロックとストアは
 * token-store.ts の TokenStore 実装に任せている:
 *
 *   - local dev: `.next/cache/d6e-dev-tokens.json` (FileTokenStore)
 *   - Vercel prod/preview: Upstash Redis (RedisTokenStore)
 */

const SAFETY_BUFFER_SECONDS = 60;
const PRE_REFRESH_WINDOW_SECONDS = 30;
const REFRESH_LOCK_TTL_SECONDS = 30;

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
    await getTokenStore().write(fresh);
    return fresh;
  }

  if (envAccess) {
    // Legacy path: only the access token is available. Use it until
    // it expires, then fail loudly. Refuse to bootstrap if the exp
    // claim cannot be decoded (malformed token).
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
        "D6E_DEV_REFRESH_TOKEN for persistent sessions.",
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
  const store = getTokenStore();

  // In-process cache still valid.
  if (cached && cached.expiresAt > now + PRE_REFRESH_WINDOW_SECONDS) {
    return cached;
  }

  // In-process single-flight: concurrent callers in the SAME process
  // share one promise. Cross-process coordination is handled by the
  // store's distributed lock below.
  if (inflightRefresh) {
    return inflightRefresh;
  }

  inflightRefresh = (async () => {
    try {
      // Re-read from the store in case another process/instance
      // already refreshed while we were queueing.
      if (!cached) {
        const fromStore = await store.read();
        if (fromStore) {
          cached = fromStore;
          if (fromStore.expiresAt > now + PRE_REFRESH_WINDOW_SECONDS) {
            return fromStore;
          }
        }
      }

      // Decide which refresh token to use.
      const refreshToken =
        (cached && cached.refreshToken) ||
        process.env.D6E_DEV_REFRESH_TOKEN ||
        "";

      if (!refreshToken) {
        // No refresh token anywhere. Try env bootstrap.
        const bootstrapped = await bootstrapFromEnv();
        if (bootstrapped) {
          cached = bootstrapped;
          return bootstrapped;
        }
        throw new Error(
          "d6e access token expired and no refresh token available. " +
            "Set D6E_DEV_REFRESH_TOKEN or provide a Redis-backed token " +
            "store populated with a valid refresh token.",
        );
      }

      // Cross-process single-flight: the store's lock ensures only one
      // Lambda/process calls d6e refresh at a time. If we lose the lock
      // race, the store polls for the winner's result and returns it.
      const fresh = await store.withRefreshLock(
        REFRESH_LOCK_TTL_SECONDS,
        async () => {
          // Double-check inside the lock: the peer might have refreshed
          // between the outer read and our lock acquisition.
          const latest = await store.read();
          if (
            latest &&
            latest.expiresAt > nowSeconds() + PRE_REFRESH_WINDOW_SECONDS
          ) {
            return latest;
          }
          const tokenToUse = (latest && latest.refreshToken) || refreshToken;
          const minted = await callRefresh(tokenToUse);
          await store.write(minted);
          return minted;
        },
      );
      cached = fresh;
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

  // Cold start: try store → env bootstrap.
  if (!cached) {
    const fromStore = await getTokenStore().read();
    if (fromStore) {
      cached = fromStore;
    } else {
      const bootstrapped = await bootstrapFromEnv();
      if (bootstrapped) cached = bootstrapped;
    }
  }

  const state = await refreshIfNeeded();
  return state.accessToken;
}
