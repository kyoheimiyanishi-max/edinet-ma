import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js v5 configuration.
 *
 * Google SSO with optional domain restriction.
 *
 * Required env vars:
 *   AUTH_SECRET           — `openssl rand -base64 32` で生成
 *   AUTH_GOOGLE_ID        — Google Cloud Console OAuth client ID
 *   AUTH_GOOGLE_SECRET    — Google Cloud Console OAuth client secret
 *
 * Optional:
 *   AUTH_ALLOWED_DOMAIN   — 許可するドメイン (例: jpforce.co.jp)
 *                           未設定なら全 Google アカウントを許可
 */

const allowedDomain = process.env.AUTH_ALLOWED_DOMAIN;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          ...(allowedDomain ? { hd: allowedDomain } : {}),
        },
      },
    }),
  ],
  callbacks: {
    signIn({ account, profile }) {
      // ドメイン制限: AUTH_ALLOWED_DOMAIN が設定されている場合は
      // Google ID token の hd クレームを検証
      if (allowedDomain && account?.provider === "google") {
        const hd = (profile as { hd?: string })?.hd;
        if (hd !== allowedDomain) {
          return false; // 拒否
        }
      }
      return true;
    },
    jwt({ token, profile }) {
      if (profile) {
        token.picture = profile.picture;
      }
      return token;
    },
    session({ session, token }) {
      if (token.picture && session.user) {
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
