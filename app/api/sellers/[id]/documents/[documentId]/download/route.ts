import { NextResponse } from "next/server";

import { downloadFile } from "@/lib/d6e/files";
import { findDocumentById } from "@/lib/d6e/repos/sellers";
import { d6eErrorResponse } from "@/lib/d6e/route-utils";

interface Ctx {
  params: Promise<{ id: string; documentId: string }>;
}

/**
 * ノンネーム等、d6e storage_file を背後に持つ document のダウンロードプロキシ。
 *
 * - まず seller スコープで document を検証 (他 seller のドキュメントは 404)
 * - document に storage_file_id が紐付いていなければ 404
 * - d6e /files/:id/download をそのまま透過ストリーム
 *
 * ブラウザの直接 URL を d6e に晒さないことで、
 * - Bearer トークンが露出しない
 * - 認可を edinet-ma のセッション経由で保てる
 * メリットがある。
 */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id: sellerId, documentId } = await ctx.params;

    const document = await findDocumentById(sellerId, documentId);
    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!document.storageFileId) {
      return NextResponse.json(
        { error: "この資料はファイル添付を持ちません" },
        { status: 404 },
      );
    }

    const upstream = await downloadFile(document.storageFileId);

    // d6e が付けた Content-Type / Disposition / Length を透過。
    // 明示的にコピーするのは fetch の Response ヘッダが全てそのまま
    // 流れないケースがあるため。
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition)
      headers.set("content-disposition", contentDisposition);
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);
    headers.set("cache-control", "private, no-store");

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    return d6eErrorResponse(err);
  }
}
