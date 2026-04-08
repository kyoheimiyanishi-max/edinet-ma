import { NextResponse } from "next/server";
import { addMinute, deleteMinute } from "@/lib/sellers";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  }
  const seller = addMinute(id, {
    title: body.title.trim(),
    date: body.date || new Date().toISOString().split("T")[0],
    participants: Array.isArray(body.participants) ? body.participants : [],
    content: body.content ?? "",
  });
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(seller, { status: 201 });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const minuteId = searchParams.get("minuteId");
  if (!minuteId) {
    return NextResponse.json(
      { error: "minuteIdクエリが必要です" },
      { status: 400 },
    );
  }
  const seller = deleteMinute(id, minuteId);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(seller);
}
