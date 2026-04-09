import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge/Node proxy (Next.js 16: 旧 middleware.ts の後継): 全ルートに HTTP
 * Basic Auth を強制する。
 *
 * 背景:
 *   edinet-ma は d6e の CRM データ (売主/社員/議事録/プロジェクト) を
 *   全件読み書きする。全 /api/* と全ページルートが無認証だったため、
 *   インターネット上の誰でもデータ閲覧・改変・AI エンドポイント呼び出し
 *   (Anthropic 課金) が可能な状態だった。
 *
 *   社内限定 / 信頼できる少人数向けのツールなので、MVP としては Basic
 *   Auth で全体をゲートする。将来的に Google SSO (Auth.js) に差し替え
 *   予定。
 *
 * 環境変数:
 *   APP_AUTH_USER     : Basic Auth ユーザー名
 *   APP_AUTH_PASSWORD : Basic Auth パスワード
 *     どちらも未設定なら proxy はスキップ (開発時の即時試し用)。
 *     production では必ず両方セットすること。
 */

const PUBLIC_PATHS = [
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/apple-icon",
  "/icon",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="edinet-ma", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const expectedUser = process.env.APP_AUTH_USER;
  const expectedPass = process.env.APP_AUTH_PASSWORD;

  // 環境変数が両方未設定なら proxy スキップ (ローカル開発補助)
  if (!expectedUser && !expectedPass) {
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("basic ")) {
    return unauthorized();
  }

  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return unauthorized();
  }

  const idx = decoded.indexOf(":");
  if (idx < 0) return unauthorized();
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);

  // 定時間比較でタイミング攻撃対策 (Edge Runtime で crypto module が
  // 使いづらいので手動比較)
  if (!constantTimeEqual(user, expectedUser ?? "")) return unauthorized();
  if (!constantTimeEqual(pass, expectedPass ?? "")) return unauthorized();

  return NextResponse.next();
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export const proxyConfig = {
  // 全ルート対象 (Next.js 内部の静的アセットは除外)
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
