import { NextResponse } from "next/server";
import type { TimeEntryInput } from "@/lib/time-entries";
import { findById, remove, update } from "@/lib/d6e/repos/time-entries";
import { getCurrentUser } from "@/lib/auth/session";
import { computeChanges, writeAudit } from "@/lib/audit";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const entry = await findById(id);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(entry);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const before = await findById(id);
  const body = (await req.json()) as Partial<TimeEntryInput>;
  const updated = await update(id, body);
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
    "time_entry",
    id,
    updated.userName + " " + updated.date,
    changes,
  );
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const ok = await remove(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await writeAudit(user, "delete", "time_entry", id);
  return NextResponse.json({ ok: true });
}
