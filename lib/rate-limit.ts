import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * AI 課金系エンドポイント (Anthropic 呼び出し) のレート制限。
 *
 * proxy.ts の Basic Auth で 1 次ゲートはしているが、認証済みの内部
 * ユーザー or 共有クレデンシャル経由の自動化による暴走 / コスト爆発を
 * 防ぐために、Upstash Redis の @upstash/ratelimit で 2 次ゲートも
 * 掛けておく。
 *
 * - 匿名 (Basic Auth ユーザー名が取れない場合は IP) に対して、
 *   スライディングウィンドウ方式で「N リクエスト / M 秒」を強制。
 * - 失敗時は 429 + Retry-After ヘッダを返し、AI SDK 側の高コスト
 *   呼び出しに到達させない。
 *
 * 既定値は AI_RATE_* 環境変数で上書き可能。
 */

let singleton: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  // Upstash Redis が設定されていない環境 (ローカル dev で KV 無効
  // 等) ではレート制限を行わない。
  if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    return null;
  }

  if (singleton) return singleton;

  const maxRequests = Number(process.env.AI_RATE_MAX ?? "20");
  const windowSeconds = Number(process.env.AI_RATE_WINDOW_SEC ?? "60");

  singleton = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
    prefix: "edinet-ma:ai-rl",
    analytics: false,
  });

  return singleton;
}

function identifyCaller(request: Request): string {
  // Basic Auth のユーザー名があればそれを識別子にする (proxy.ts で既に
  // 認証済みなのでヘッダはここに来ている)。
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("basic ")) {
    try {
      const decoded = atob(auth.slice(6).trim());
      const user = decoded.split(":")[0];
      if (user) return `user:${user}`;
    } catch {
      // fall through
    }
  }
  // Fallback: forwarded IP (Vercel sets `x-forwarded-for`)
  const fwd = request.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim();
  return ip ? `ip:${ip}` : "anon";
}

/**
 * AI エンドポイント用のレート制限チェック。NextResponse を返した
 * 場合はそのまま早期 return してよい。null を返した場合は処理続行可。
 */
export async function aiRateLimitGate(
  request: Request,
  scope: string,
): Promise<NextResponse | null> {
  const limiter = getLimiter();
  if (!limiter) return null; // 設定なし = 制限なし (dev 補助)

  const identifier = `${scope}:${identifyCaller(request)}`;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (success) return null;

  const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    {
      error:
        "AI エンドポイントのレート制限に達しました。しばらく待ってから再試行してください。",
      limit,
      remaining,
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
      },
    },
  );
}
