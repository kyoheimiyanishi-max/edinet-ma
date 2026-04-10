import { NextResponse } from "next/server";
import type { OutreachTemplateInput } from "@/lib/outreach";
import { createTemplate, findAllTemplates } from "@/lib/d6e/repos/outreach";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

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
  const user = await getCurrentUser();
  const created = await createTemplate({
    name: body.name.trim(),
    channel: body.channel ?? "email",
    subject: body.subject?.trim(),
    body: body.body,
    description: body.description?.trim(),
  });
  await writeAudit(
    user,
    "create",
    "outreach_template",
    created.id,
    created.name,
  );
  return NextResponse.json(created, { status: 201 });
}
