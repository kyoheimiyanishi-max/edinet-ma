import { NextResponse } from "next/server";
import type { EmployeeInput } from "@/lib/employees";
import { findAll, create } from "@/lib/d6e/repos/employees";

export async function GET() {
  return NextResponse.json(await findAll());
}

export async function POST(req: Request) {
  const body = (await req.json()) as EmployeeInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
  }

  const employee = await create({
    name: body.name.trim(),
    email: body.email?.trim() ?? "",
    department: body.department ?? "",
    position: body.position ?? "",
    phone: body.phone?.trim() ?? "",
  });

  return NextResponse.json(employee, { status: 201 });
}
