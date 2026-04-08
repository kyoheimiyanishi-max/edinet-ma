import { NextResponse } from "next/server";
import type { EmployeeInput } from "@/lib/employees";
import { findById, update, remove } from "@/lib/d6e/repos/employees";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const emp = await findById(id);
  if (!emp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(emp);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<EmployeeInput>;
  const emp = await update(id, body);
  if (!emp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(emp);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = await remove(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
