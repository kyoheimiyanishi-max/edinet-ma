import { NextResponse } from "next/server";
import type { OutreachLogInput } from "@/lib/outreach";
import { deleteLog, findLogById, updateLog } from "@/lib/d6e/repos/outreach";
import { getCurrentUser } from "@/lib/auth/session";
import { computeChanges, writeAudit } from "@/lib/audit";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const log = await findLogById(id);
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(log);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const before = await findLogById(id);
  const body = (await req.json()) as Partial<OutreachLogInput>;
  const updated = await updateLog(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const changes = before
    ? computeChanges(
        before as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>,
      )
    : null;
  await writeAudit(
    user,
    "update",
    "outreach_log",
    id,
    updated.buyerCompanyName ?? "outreach",
    changes,
  );
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const ok = await deleteLog(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await writeAudit(user, "delete", "outreach_log", id);
  return NextResponse.json({ ok: true });
}
