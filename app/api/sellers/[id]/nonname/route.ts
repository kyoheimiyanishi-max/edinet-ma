import { NextResponse } from "next/server";

import { writeAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/session";
import { d6eErrorResponse } from "@/lib/d6e/route-utils";
import {
  generateAndRecordNonname,
  NonnameConfigError,
} from "@/lib/slide/nonname-service";

interface Ctx {
  params: Promise<{ id: string }>;
}

// d6e STF Docker Runtime の起動 + 生成 + upload で最大 5 分想定。
// Vercel の Fluid Compute タイムアウト (デフォルト 300s) と揃える。
export const maxDuration = 300;

/**
 * ノンネーム資料 (.pptx) を新規生成する。
 *
 * フロー:
 *   1. d6e から seller 取得 → spec 生成 (匿名化込み)
 *   2. d6e STF instant-run で Docker コンテナ起動 (python-pptx)
 *   3. コンテナが d6e /files に .pptx を base64 JSON で POST
 *   4. 返ってきた file_id を seller_documents.storage_file_id に記録
 *   5. 作成された document を返す
 */
export async function POST(_req: Request, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    const { id } = await ctx.params;

    const { document } = await generateAndRecordNonname(id);

    await writeAudit(user, "create", "seller_document", id, document.title);

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    if (err instanceof NonnameConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return d6eErrorResponse(err);
  }
}
