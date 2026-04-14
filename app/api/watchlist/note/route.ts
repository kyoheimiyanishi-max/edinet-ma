import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveCompanyId, updateNote } from "@/lib/d6e/repos/user-watchlists";

export const runtime = "nodejs";

/**
 * PATCH /api/watchlist/note
 * ボディ: { companyId? / corporateNumber? / edinetCode?, note: string | null }
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    companyId?: string;
    corporateNumber?: string;
    edinetCode?: string;
    note?: string | null;
  };

  let companyId = body.companyId?.trim();
  if (!companyId) {
    const resolved = await resolveCompanyId({
      corporateNumber: body.corporateNumber?.trim() || undefined,
      edinetCode: body.edinetCode?.trim() || undefined,
    });
    if (!resolved) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    companyId = resolved;
  }

  const ok = await updateNote(
    user.email,
    companyId,
    body.note != null ? String(body.note).trim() || null : null,
  );
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
