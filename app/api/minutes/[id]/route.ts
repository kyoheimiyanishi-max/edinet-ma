import { NextResponse } from "next/server";
import {
  getMinute,
  updateMinute,
  deleteMinute,
  type MeetingMinuteInput,
} from "@/lib/minutes";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const minute = getMinute(id);
  if (!minute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(minute);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json()) as Partial<MeetingMinuteInput>;
  const minute = updateMinute(id, body);
  if (!minute) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(minute);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = deleteMinute(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
