import { NextResponse } from "next/server";
import {
  getAllEmployees,
  createEmployee,
  type EmployeeInput,
} from "@/lib/employees";

export async function GET() {
  return NextResponse.json(getAllEmployees());
}

export async function POST(req: Request) {
  const body = (await req.json()) as EmployeeInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
  }

  const employee = createEmployee({
    name: body.name.trim(),
    email: body.email?.trim() ?? "",
    department: body.department ?? "",
    position: body.position ?? "",
    phone: body.phone?.trim() ?? "",
  });

  return NextResponse.json(employee, { status: 201 });
}
