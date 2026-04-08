import { NextResponse } from "next/server";
import type { SellerInput } from "@/lib/sellers";
import { findById, update, remove } from "@/lib/d6e/repos/sellers";
import { clearSellerFromProjects } from "@/lib/d6e/repos/projects";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const seller = await findById(id);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(seller);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<SellerInput>;
  const seller = await update(id, body);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(seller);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  // Clear project references first to avoid FK constraint failure.
  await clearSellerFromProjects(id);
  const ok = await remove(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
