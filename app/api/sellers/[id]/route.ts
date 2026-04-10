import { NextResponse } from "next/server";
import type { SellerInput } from "@/lib/sellers";
import { findById, update, remove } from "@/lib/d6e/repos/sellers";
import { clearSellerFromProjects } from "@/lib/d6e/repos/projects";
import { getCurrentUser } from "@/lib/auth/session";
import { computeChanges, writeAudit } from "@/lib/audit";

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
  const user = await getCurrentUser();
  const { id } = await ctx.params;
  const before = await findById(id);
  if (!before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = (await req.json()) as Partial<SellerInput>;
  const seller = await update(id, body);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const changes = computeChanges(
    before as unknown as Record<string, unknown>,
    seller as unknown as Record<string, unknown>,
  );
  await writeAudit(user, "update", "seller", id, seller.companyName, changes);
  return NextResponse.json(seller);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  const { id } = await ctx.params;
  const seller = await findById(id);
  // Clear project references first to avoid FK constraint failure.
  await clearSellerFromProjects(id);
  const ok = await remove(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeAudit(user, "delete", "seller", id, seller?.companyName ?? id);
  return NextResponse.json({ ok: true });
}
