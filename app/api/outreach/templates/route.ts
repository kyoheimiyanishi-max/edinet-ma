import { NextResponse } from "next/server";
import type { OutreachTemplateInput } from "@/lib/outreach";
import { createTemplate, findAllTemplates } from "@/lib/d6e/repos/outreach";

export async function GET() {
  return NextResponse.json(await findAllTemplates());
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<OutreachTemplateInput>;
  if (!body.name?.trim() || !body.body?.trim()) {
    return NextResponse.json(
      { error: "テンプレート名と本文は必須です" },
      { status: 400 },
    );
  }
  const created = await createTemplate({
    name: body.name.trim(),
    channel: body.channel ?? "email",
    subject: body.subject?.trim(),
    body: body.body,
    description: body.description?.trim(),
  });
  return NextResponse.json(created, { status: 201 });
}
