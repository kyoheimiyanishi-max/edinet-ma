import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { Redis } from "@upstash/redis";

/**
 * d6e 認証トークンの永続化層。2 つの実装を環境に応じて選ぶ:
 *
 *   - `FileTokenStore`: ローカル開発用。`.next/cache/d6e-dev-tokens.json` に
 *     JSON で保存。シングルプロセスなので分散ロック不要。
 *
 *   - `RedisTokenStore`: Vercel サーバレス用。Upstash Redis (Vercel
 *     Marketplace 経由で `KV_REST_API_URL` / `KV_REST_API_TOKEN` が自動
 *     注入される前提) にトークンを保存し、refresh ローテートを全 Lambda
 *     インスタンス間で共有する。Redis の `SET NX` ベースの分散ロックで
 *     single-flight refresh を保証する。
 */

export interface TokenState {
  accessToken: string;
  refreshToken: string;
  /** Epoch seconds. */
  expiresAt: number;
}

export interface TokenStore {
  read(): Promise<TokenState | null>;
  write(state: TokenState): Promise<void>;
  /**
   * 分散ロックを acquire して refresh を実行する。ロック取得中に他の
   * caller が refresh を完了していればそれを返す。ttlSeconds はロック
   * の最大保持時間 (refresh 呼び出しがハングした場合の救済)。
   */
  withRefreshLock<T extends TokenState>(
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T>;
}

// ---- File-based (local dev) ----

const FILE_CACHE_PATH = ".next/cache/d6e-dev-tokens.json";

class FileTokenStore implements TokenStore {
  async read(): Promise<TokenState | null> {
    try {
      const raw = await readFile(FILE_CACHE_PATH, "utf-8");
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

  async write(state: TokenState): Promise<void> {
    try {
      await mkdir(dirname(FILE_CACHE_PATH), { recursive: true });
      await writeFile(FILE_CACHE_PATH, JSON.stringify(state, null, 2), "utf-8");
    } catch {
      // non-fatal; the next refresh will try again
    }
  }

  async withRefreshLock<T extends TokenState>(
    _ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    // シングルプロセスなので分散ロック不要。呼び出し元の in-memory
    // single-flight で十分。
    return fn();
  }
}

// ---- Redis-based (Vercel serverless) ----

const REDIS_STATE_KEY = "d6e:auth:token";
const REDIS_LOCK_KEY = "d6e:auth:refresh-lock";

class RedisTokenStore implements TokenStore {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async read(): Promise<TokenState | null> {
    const raw = await this.redis.get<TokenState | string>(REDIS_STATE_KEY);
    if (raw == null) return null;
    // Upstash は JSON を自動で parse するが、旧データが文字列として
    // 残っている場合にも備えて両対応する。
    const parsed: Partial<TokenState> =
      typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      typeof parsed.accessToken === "string" &&
      typeof parsed.refreshToken === "string" &&
      typeof parsed.expiresAt === "number"
    ) {
      return parsed as TokenState;
    }
    return null;
  }

  async write(state: TokenState): Promise<void> {
    // TTL は expiresAt の少し後に設定してストア掃除を自動化。refresh
    // token 自体は access token 失効後もしばらく有効 (refresh で再入手
    // できる) なので、余裕を持って 7 日保持する。
    await this.redis.set(REDIS_STATE_KEY, state, { ex: 7 * 24 * 60 * 60 });
  }

  async withRefreshLock<T extends TokenState>(
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const lockValue = `${Date.now()}-${Math.random()}`;
    const acquired = await this.redis.set(REDIS_LOCK_KEY, lockValue, {
      nx: true,
      ex: ttlSeconds,
    });

    if (acquired === "OK") {
      // ロック取得成功: 自分が refresh を実行する
      try {
        return await fn();
      } finally {
        // ロック解放 (他者がロックを上書きしていないことを念のため確認)
        const current = await this.redis.get<string>(REDIS_LOCK_KEY);
        if (current === lockValue) {
          await this.redis.del(REDIS_LOCK_KEY);
        }
      }
    }

    // ロック取得失敗: 他の Lambda が refresh 中。ポーリングして新しい
    // トークンが書き込まれるのを待つ。
    const pollIntervalMs = 250;
    const maxWaitMs = ttlSeconds * 1000;
    const startedAt = Date.now();
    while (Date.now() - startedAt < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const state = await this.read();
      if (state && state.expiresAt > Math.floor(Date.now() / 1000) + 30) {
        return state as T;
      }
    }
    throw new Error(
      "d6e auth refresh lock timed out waiting for peer to complete refresh",
    );
  }
}

// ---- Factory ----

let singleton: TokenStore | null = null;

/**
 * 環境に応じた TokenStore を 1 回だけ構築して返す。
 *
 *   - Upstash Redis の env var (KV_REST_API_URL or UPSTASH_REDIS_REST_URL)
 *     が立っていれば Redis 実装
 *   - それ以外（ローカル dev 等）は File 実装
 */
export function getTokenStore(): TokenStore {
  if (singleton) return singleton;

  const hasRedis =
    !!process.env.KV_REST_API_URL || !!process.env.UPSTASH_REDIS_REST_URL;

  if (hasRedis) {
    singleton = new RedisTokenStore(Redis.fromEnv());
  } else {
    singleton = new FileTokenStore();
  }

  return singleton;
}
