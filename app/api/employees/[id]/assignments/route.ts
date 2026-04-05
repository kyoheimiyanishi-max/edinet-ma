import { NextResponse } from "next/server";
import { addAssignment, removeAssignment } from "@/lib/employees";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();

  if (!body.companyCode || !body.companyName) {
    return NextResponse.json(
      { error: "企業コードと企業名は必須です" },
      { status: 400 },
    );
  }

  const emp = addAssignment(id, {
    companyCode: body.companyCode,
    companyName: body.companyName,
    role: body.role ?? "主担当",
    status: body.status ?? "アクティブ",
    note: body.note ?? "",
  });

  if (!emp) {
    return NextResponse.json(
      { error: "社員が見つかりません" },
      { status: 404 },
    );
  }
  return NextResponse.json(emp);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const companyCode = searchParams.get("companyCode");

  if (!companyCode) {
    return NextResponse.json(
      { error: "companyCode は必須です" },
      { status: 400 },
    );
  }

  const emp = removeAssignment(id, companyCode);
  if (!emp) {
    return NextResponse.json(
      { error: "社員が見つかりません" },
      { status: 404 },
    );
  }
  return NextResponse.json(emp);
}
