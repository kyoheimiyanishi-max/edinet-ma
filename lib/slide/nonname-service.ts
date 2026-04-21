import "server-only";

import { addDocument, findById } from "@/lib/d6e/repos/sellers";
import { instantRunStf } from "@/lib/d6e/stfs";
import type { Seller, SellerDocument } from "@/lib/sellers";

import { buildNonnameSpec } from "./nonname-spec";

/**
 * seller → ノンネーム .pptx 生成 → d6e /files upload → seller_documents 記録
 * を一気通貫で行うオーケストレーター。
 *
 * STF 呼出モードは環境変数で決定:
 *   D6E_NONNAME_STF_VERSION_ID — 事前登録した STF バージョン ID を使う (推奨)
 *   D6E_NONNAME_IMAGE          — image 参照を code モードで直接渡す (fallback)
 * 両方未設定なら 500 エラー。
 *
 * STF コンテナが stdout に返す JSON:
 *   { file_id, filename, size, content_type }
 */

export interface NonnameStfOutput {
  file_id: string;
  filename: string;
  size: number;
  content_type?: string;
}

export class NonnameConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonnameConfigError";
  }
}

function resolveStfArgs(input: unknown) {
  const versionId = process.env.D6E_NONNAME_STF_VERSION_ID?.trim();
  if (versionId) {
    return { stfVersionId: versionId, input };
  }
  const image = process.env.D6E_NONNAME_IMAGE?.trim();
  if (image) {
    return { image, input };
  }
  throw new NonnameConfigError(
    "D6E_NONNAME_STF_VERSION_ID か D6E_NONNAME_IMAGE のどちらかを設定してください",
  );
}

function nonnameFilename(seller: Seller): string {
  // シート用に日付入り・asciiライクなファイル名を優先 (英語環境でも開きやすく)
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  // 社名は匿名化後の spec 側で処理済。ファイル名には id 短縮形を入れて判別可能にする
  const shortId = seller.id.replace(/-/g, "").slice(0, 8);
  return `nonname-${shortId}-${ts}.pptx`;
}

/**
 * 指定 seller のノンネーム資料を生成して d6e にアップロード、
 * seller_documents に storage_file_id を記録して、作成された
 * SellerDocument 行を返す。
 */
export async function generateAndRecordNonname(
  sellerId: string,
): Promise<{ seller: Seller; document: SellerDocument }> {
  const seller = await findById(sellerId);
  if (!seller) {
    throw new Error(`seller not found: ${sellerId}`);
  }

  const spec = buildNonnameSpec(seller);
  const filename = nonnameFilename(seller);
  const args = resolveStfArgs({ spec, filename });

  const output = await instantRunStf<NonnameStfOutput>(args);
  if (!output?.file_id) {
    throw new Error("STF output missing file_id");
  }

  const updated = await addDocument(sellerId, {
    title: `ノンネーム資料 (${filename})`,
    content: "",
    storageFileId: output.file_id,
  });
  if (!updated) {
    throw new Error("addDocument returned null after generation");
  }
  // addDocument は全 documents 配列を返すので、storage_file_id が新規作成分と
  // 一致する 1 件を抽出する (UUID の重複はほぼあり得ないが念のため最新で絞る)
  const doc =
    updated.documents.find((d) => d.storageFileId === output.file_id) ??
    updated.documents[0];
  if (!doc) {
    throw new Error("generated document not found in seller aggregate");
  }
  return { seller: updated, document: doc };
}
