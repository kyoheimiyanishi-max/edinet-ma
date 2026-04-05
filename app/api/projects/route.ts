import { NextResponse } from "next/server";
import {
  getAllProjects,
  createProject,
  type ProjectInput,
} from "@/lib/projects";

export async function GET() {
  return NextResponse.json(getAllProjects());
}

export async function POST(req: Request) {
  const body = (await req.json()) as ProjectInput;

  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: "プロジェクト名は必須です" },
      { status: 400 },
    );
  }

  const project = createProject({
    name: body.name.trim(),
    description: body.description ?? "",
    status: body.status ?? "企画中",
    priority: body.priority ?? "中",
    relatedCompanies: body.relatedCompanies ?? [],
    assignedEmployeeIds: body.assignedEmployeeIds ?? [],
    startDate: body.startDate ?? "",
    targetDate: body.targetDate ?? "",
  });

  return NextResponse.json(project, { status: 201 });
}
