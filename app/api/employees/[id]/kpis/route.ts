import { NextResponse } from "next/server";
import { addKpi } from "@/lib/d6e/repos/employees";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();

  if (!body.metric || !body.period) {
    return NextResponse.json(
      { error: "指標名と期間は必須です" },
      { status: 400 },
    );
  }

  const emp = await addKpi(id, {
    period: String(body.period),
    metric: String(body.metric),
    target: Number(body.target) || 0,
    actual: Number(body.actual) || 0,
    unit: String(body.unit ?? ""),
    note: String(body.note ?? ""),
  });

  if (!emp) {
    return NextResponse.json(
      { error: "社員が見つかりません" },
      { status: 404 },
    );
  }
  return NextResponse.json(emp);
}
