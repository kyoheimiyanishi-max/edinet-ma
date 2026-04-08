import { NextResponse } from "next/server";
import {
  getSeller,
  updateSeller,
  deleteSeller,
  type SellerInput,
} from "@/lib/sellers";
import { clearSellerFromProjects } from "@/lib/projects";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const seller = getSeller(id);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(seller);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<SellerInput>;
  const seller = updateSeller(id, body);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(seller);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = deleteSeller(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  clearSellerFromProjects(id);
  return NextResponse.json({ ok: true });
}
