import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";

/**
 * Next.js 16 proxy (旧 middleware.ts).
 *
 * 認証方式の優先度:
 *   1. Auth.js (Google SSO) — AUTH_GOOGLE_ID が設定されていれば使用
 *   2. Basic Auth — APP_AUTH_USER が設定されていれば使用
 *   3. スキップ — どちらも未設定ならオープン (ローカル dev 補助)
 */

const AUTH_PUBLIC_PATHS = [
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/apple-icon",
  "/icon",
  "/login",
  "/api/auth",
];

function isPublicPath(pathname: string): boolean {
  return AUTH_PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// ---- Auth.js mode ----

async function authJsProxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const session = await auth();
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ヘッダーにユーザー情報を付与 (API ルート側でも利用可能にする)
  const response = NextResponse.next();
  response.headers.set("x-user-email", session.user.email ?? "");
  response.headers.set("x-user-name", session.user.name ?? "");
  return response;
}

// ---- Basic Auth mode (fallback) ----

/**
 * Basic Auth — 2 つのモードに対応:
 *
 *   1. 複数ユーザーモード (推奨):
 *      APP_AUTH_USERS = {"tanaka":"pass1","yamada":"pass2",...}
 *      社員ごとにアカウントを発行でき、監査ログにユーザー名が残る。
 *
 *   2. 共有ユーザーモード (従来互換):
 *      APP_AUTH_USER = edinet-ma
 *      APP_AUTH_PASSWORD = xxx
 */

let parsedUsers: Record<string, string> | null = null;

function getAuthUsers(): Record<string, string> {
  if (parsedUsers) return parsedUsers;
  // 複数ユーザーモード
  const usersJson = process.env.APP_AUTH_USERS;
  if (usersJson) {
    try {
      parsedUsers = JSON.parse(usersJson) as Record<string, string>;
      return parsedUsers;
    } catch {
      console.error("[proxy] APP_AUTH_USERS の JSON パースに失敗");
    }
  }
  // 共有ユーザーモード (fallback)
  const singleUser = process.env.APP_AUTH_USER;
  const singlePass = process.env.APP_AUTH_PASSWORD;
  if (singleUser && singlePass) {
    parsedUsers = { [singleUser]: singlePass };
    return parsedUsers;
  }
  parsedUsers = {};
  return parsedUsers;
}

function basicAuthProxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const users = getAuthUsers();
  if (Object.keys(users).length === 0) return NextResponse.next();

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

  const expected = users[user];
  if (!expected || !constantTimeEqual(pass, expected)) {
    return unauthorized();
  }

  // ユーザー情報をヘッダーに付与 (監査ログで使用)
  const response = NextResponse.next();
  response.headers.set("x-user-email", user);
  response.headers.set("x-user-name", user);
  return response;
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

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ---- Entrypoint ----

const useAuthJs = !!process.env.AUTH_GOOGLE_ID;

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (useAuthJs) {
    return authJsProxy(request);
  }
  return basicAuthProxy(request);
}

export const proxyConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
