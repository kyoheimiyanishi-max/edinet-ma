import { NextResponse } from "next/server";
import { suggestCompanies } from "@/lib/edinet-codelist";

export const runtime = "nodejs";

/**
 * GET /api/companies/suggest?q=...&limit=10
 *
 * EDINET コードリスト (ローカル JSON) を対象にした軽量サジェスト。
 * 企業名 (株式会社等除外・大小英数正規化) と 証券コード (4〜5桁数字) を
 * 同一エンドポイントで受け付ける。DB アクセスや外部 API 呼び出しは無い。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const limitRaw = Number(url.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.trunc(limitRaw)), 20)
    : 10;

  if (!q.trim()) {
    return NextResponse.json({ hits: [] });
  }

  const hits = suggestCompanies(q, limit);
  return NextResponse.json(
    { hits },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    },
  );
}
