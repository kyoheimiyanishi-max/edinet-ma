import { NextResponse } from "next/server";
import { addDocument, deleteDocument } from "@/lib/d6e/repos/sellers";
import { d6eErrorResponse } from "@/lib/d6e/route-utils";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAudit } from "@/lib/audit";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: "資料タイトルは必須です" },
        { status: 400 },
      );
    }
    const seller = await addDocument(id, {
      title: body.title.trim(),
      content: body.content ?? "",
    });
    if (!seller) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await writeAudit(user, "create", "seller_document", id, body.title);
    return NextResponse.json(seller, { status: 201 });
  } catch (err) {
    return d6eErrorResponse(err);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    if (!documentId) {
      return NextResponse.json(
        { error: "documentIdクエリが必要です" },
        { status: 400 },
      );
    }
    const seller = await deleteDocument(id, documentId);
    if (!seller) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await writeAudit(user, "delete", "seller_document", documentId);
    return NextResponse.json(seller);
  } catch (err) {
    return d6eErrorResponse(err);
  }
}
