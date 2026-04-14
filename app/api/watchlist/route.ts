import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";
import {
  addOrUpdate,
  findByUser,
  remove,
  resolveCompanyId,
} from "@/lib/d6e/repos/user-watchlists";

export const runtime = "nodejs";

/**
 * GET /api/watchlist
 * 現在ユーザーのウォッチ企業一覧。
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await findByUser(user.email);
  return NextResponse.json({ entries: list });
}

/**
 * POST /api/watchlist
 * ボディ: { companyId? , corporateNumber? , edinetCode?, note? }
 * companyId が直接与えられればそれを使い、無ければ法人番号 / EDINETコードから
 * d6e companies.id を解決する。
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    companyId?: string;
    corporateNumber?: string;
    edinetCode?: string;
    note?: string;
  };

  let companyId = body.companyId?.trim();
  if (!companyId) {
    const resolved = await resolveCompanyId({
      corporateNumber: body.corporateNumber?.trim() || undefined,
      edinetCode: body.edinetCode?.trim() || undefined,
    });
    if (!resolved) {
      return NextResponse.json(
        { error: "企業が d6e companies に見つかりません" },
        { status: 404 },
      );
    }
    companyId = resolved;
  }

  const entry = await addOrUpdate({
    userEmail: user.email,
    companyId,
    note: body.note?.trim() || undefined,
  });
  await writeAudit(user, "create", "watchlist", entry.id, entry.company.name);

  return NextResponse.json(entry, { status: 201 });
}

/**
 * DELETE /api/watchlist?companyId=...&corporateNumber=...&edinetCode=...
 */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  let companyId = url.searchParams.get("companyId") ?? undefined;
  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        corporateNumber: url.searchParams.get("corporateNumber") ?? undefined,
        edinetCode: url.searchParams.get("edinetCode") ?? undefined,
      })) ?? undefined;
  }
  if (!companyId) {
    return NextResponse.json(
      {
        error: "companyId / corporateNumber / edinetCode のいずれかが必要です",
      },
      { status: 400 },
    );
  }

  const ok = await remove(user.email, companyId);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeAudit(user, "delete", "watchlist", companyId);
  return NextResponse.json({ ok: true });
}
