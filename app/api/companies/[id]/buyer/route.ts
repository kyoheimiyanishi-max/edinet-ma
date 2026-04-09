import { NextResponse } from "next/server";
import {
  type BuyerProspectStatus,
  type CompanyInput,
  update as updateCompany,
} from "@/lib/d6e/repos/companies";

interface Ctx {
  params: Promise<{ id: string }>;
}

interface BuyerPatchBody {
  buyerStatus?: BuyerProspectStatus | null;
  strongBuyer?: boolean;
  targetDeal?: string | null;
  lastApproachDate?: string | null;
  lastApproachMethod?: string | null;
  ndaDate?: string | null;
  buyerAssignedTo?: string | null;
}

/**
 * PATCH /api/companies/[id]/buyer
 *
 * 買手プロスペクト関連カラム (buyer_status / strong_buyer / target_deal /
 * last_approach_date / last_approach_method / nda_date / buyer_assigned_to)
 * のみを部分更新する専用エンドポイント。
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as BuyerPatchBody;

  const patch: Partial<CompanyInput> = {};
  if ("buyerStatus" in body) {
    patch.buyerStatus = body.buyerStatus ?? undefined;
  }
  if ("strongBuyer" in body) {
    patch.strongBuyer = body.strongBuyer ?? false;
  }
  if ("targetDeal" in body) {
    patch.targetDeal = body.targetDeal ?? undefined;
  }
  if ("lastApproachDate" in body) {
    patch.lastApproachDate = body.lastApproachDate ?? undefined;
  }
  if ("lastApproachMethod" in body) {
    patch.lastApproachMethod = body.lastApproachMethod ?? undefined;
  }
  if ("ndaDate" in body) {
    patch.ndaDate = body.ndaDate ?? undefined;
  }
  if ("buyerAssignedTo" in body) {
    patch.buyerAssignedTo = body.buyerAssignedTo ?? undefined;
  }

  const updated = await updateCompany(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
