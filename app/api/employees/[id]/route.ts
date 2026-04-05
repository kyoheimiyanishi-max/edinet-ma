import { NextResponse } from "next/server";
import {
  getEmployee,
  updateEmployee,
  deleteEmployee,
  type EmployeeInput,
} from "@/lib/employees";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const emp = getEmployee(id);
  if (!emp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(emp);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<EmployeeInput>;
  const emp = updateEmployee(id, body);
  if (!emp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(emp);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = deleteEmployee(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
