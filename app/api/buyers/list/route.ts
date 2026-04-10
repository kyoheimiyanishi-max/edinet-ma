import { NextResponse } from "next/server";
import { search } from "@/lib/d6e/repos/companies";

/**
 * GET /api/buyers/list[?q=foo]
 *
 * OutreachManager 等が「買手候補の検索＋選択」で使う軽量エンドポイント。
 * 返却するのは id と name のみで、q が指定されていれば部分一致検索。
 * 未指定なら直近 100 件の買手候補を返す。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const companies = await search({
    isBuyer: true,
    ...(q ? { query: q } : {}),
    limit: 100,
  });
  return NextResponse.json(companies.map((c) => ({ id: c.id, name: c.name })));
}
