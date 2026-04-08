import { NextResponse } from "next/server";
import type { MeetingMinuteInput } from "@/lib/minutes";
import { findById, update, remove } from "@/lib/d6e/repos/minutes";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const minute = await findById(id);
  if (!minute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(minute);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<MeetingMinuteInput>;
  const minute = await update(id, body);
  if (!minute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(minute);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = await remove(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
