import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { markSeen, resolveCompanyId } from "@/lib/d6e/repos/user-watchlists";

export const runtime = "nodejs";

/**
 * POST /api/watchlist/seen
 * ボディ: {
 *   companyId?: string,
 *   corporateNumber?: string,
 *   edinetCode?: string,
 *   fiscalYear?: number,
 *   revenue?: number | null,
 *   operatingIncome?: number | null,
 *   netIncome?: number | null,
 *   equity?: number | null
 * }
 *
 * ウォッチ一覧ページを開いた瞬間に呼ぶ「既読」エンドポイント。
 * 送られてきた最新財務値をスナップショット列に保存し、次回閲覧時の
 * 「新着」(NEW バッジ) 判定に使う。
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    companyId?: string;
    corporateNumber?: string;
    edinetCode?: string;
    fiscalYear?: number;
    revenue?: number | null;
    operatingIncome?: number | null;
    netIncome?: number | null;
    equity?: number | null;
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

  await markSeen(user.email, companyId, {
    ...(body.fiscalYear !== undefined ? { fiscalYear: body.fiscalYear } : {}),
    ...(body.revenue !== undefined ? { revenue: body.revenue } : {}),
    ...(body.operatingIncome !== undefined
      ? { operatingIncome: body.operatingIncome }
      : {}),
    ...(body.netIncome !== undefined ? { netIncome: body.netIncome } : {}),
    ...(body.equity !== undefined ? { equity: body.equity } : {}),
  });

  return NextResponse.json({ ok: true });
}
