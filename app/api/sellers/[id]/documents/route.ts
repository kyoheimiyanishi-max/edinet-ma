import { NextResponse } from "next/server";
import { addDocument, deleteDocument } from "@/lib/sellers";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "資料タイトルは必須です" },
      { status: 400 },
    );
  }
  const seller = addDocument(id, {
    title: body.title.trim(),
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
  const documentId = searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json(
      { error: "documentIdクエリが必要です" },
      { status: 400 },
    );
  }
  const seller = deleteDocument(id, documentId);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(seller);
}
