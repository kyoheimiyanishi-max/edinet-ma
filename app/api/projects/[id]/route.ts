import { NextResponse } from "next/server";
import type { ProjectInput } from "@/lib/projects";
import { findById, update, remove } from "@/lib/d6e/repos/projects";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const project = await findById(id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<ProjectInput>;
  if ("sellerId" in body && !body.sellerId) {
    body.sellerId = undefined;
  }
  const project = await update(id, body);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = await remove(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
