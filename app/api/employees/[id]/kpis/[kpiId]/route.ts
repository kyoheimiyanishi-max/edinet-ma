import { NextResponse } from "next/server";
import { updateKpi, removeKpi } from "@/lib/d6e/repos/employees";

interface Ctx {
  params: Promise<{ id: string; kpiId: string }>;
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id, kpiId } = await ctx.params;
  const body = await req.json();

  const patch: Record<string, string | number> = {};
  if (body.period !== undefined) patch.period = String(body.period);
  if (body.metric !== undefined) patch.metric = String(body.metric);
  if (body.target !== undefined) patch.target = Number(body.target) || 0;
  if (body.actual !== undefined) patch.actual = Number(body.actual) || 0;
  if (body.unit !== undefined) patch.unit = String(body.unit);
  if (body.note !== undefined) patch.note = String(body.note);

  const emp = await updateKpi(id, kpiId, patch);
  if (!emp) {
    return NextResponse.json({ error: "KPIが見つかりません" }, { status: 404 });
  }
  return NextResponse.json(emp);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id, kpiId } = await ctx.params;
  const emp = await removeKpi(id, kpiId);
  if (!emp) {
    return NextResponse.json({ error: "KPIが見つかりません" }, { status: 404 });
  }
  return NextResponse.json(emp);
}
