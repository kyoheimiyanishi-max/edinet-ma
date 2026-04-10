import "server-only";

import { auth } from "./config";
import { headers } from "next/headers";

export interface AppUser {
  email: string;
  name: string;
  image?: string;
}

/**
 * 現在のリクエストのセッションからユーザーを取得する。
 *
 * 認証方式に応じて 2 つのソースから取得を試みる:
 *   1. Auth.js セッション (Google SSO)
 *   2. proxy.ts が付与した x-user-email ヘッダー (Basic Auth)
 *
 * どちらもなければ null を返す。
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  // 1. Auth.js セッション
  try {
    const session = await auth();
    if (session?.user?.email) {
      return {
        email: session.user.email,
        name: session.user.name ?? session.user.email.split("@")[0],
        image: session.user.image ?? undefined,
      };
    }
  } catch {
    // Auth.js 未設定時は例外が出ることがある — fallthrough
  }

  // 2. Basic Auth (proxy.ts が x-user-email ヘッダーを付与)
  const h = await headers();
  const email = h.get("x-user-email");
  if (email) {
    const name = h.get("x-user-name") ?? email;
    return { email, name };
  }

  return null;
}

/**
 * 認証必須のルートで使用。未認証なら例外を投げる。
 */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
