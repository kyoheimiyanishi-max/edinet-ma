import { NextResponse } from "next/server";
import type { OutreachTemplateInput } from "@/lib/outreach";
import {
  deleteTemplate,
  findTemplateById,
  updateTemplate,
} from "@/lib/d6e/repos/outreach";
import { getCurrentUser } from "@/lib/auth/session";
import { computeChanges, writeAudit } from "@/lib/audit";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const tpl = await findTemplateById(id);
  if (!tpl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(tpl);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const before = await findTemplateById(id);
  const body = (await req.json()) as Partial<OutreachTemplateInput>;
  const updated = await updateTemplate(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const changes = before
    ? computeChanges(
        before as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>,
      )
    : null;
  await writeAudit(user, "update", "outreach_template", id, updated.name, changes);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const ok = await deleteTemplate(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeAudit(user, "delete", "outreach_template", id);
  return NextResponse.json({ ok: true });
}
