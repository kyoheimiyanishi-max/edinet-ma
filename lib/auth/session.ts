import "server-only";

import { auth } from "./config";

export interface AppUser {
  email: string;
  name: string;
  image?: string;
}

/**
 * 現在のリクエストのセッションからユーザーを取得する。
 * 認証されていなければ null を返す。
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return {
    email: session.user.email,
    name: session.user.name ?? session.user.email.split("@")[0],
    image: session.user.image ?? undefined,
  };
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
