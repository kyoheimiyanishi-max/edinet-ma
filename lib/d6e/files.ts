import "server-only";

import { getAccessToken } from "./auth";
import { D6eApiError } from "./client";
import { D6E_API_URL, D6E_WORKSPACE_ID } from "./config";

/**
 * d6e Storage Files API クライアント
 *
 * d6e の `storage_file` テーブルは workspace 単位のファイル置き場で、
 * PostgreSQL BYTEA にバイナリを直書きする (最大 1GB)。
 *
 * アップロードは 2 経路:
 *   - エッジ (Next.js) から: 本モジュールの `uploadJson`
 *   - STF コンテナ内部から: `storage_file.py` 側で内部 API 直接呼出
 *
 * 通常は STF コンテナが upload → file_id を stdout で返す経路を使うので、
 * Next.js 側は list / metadata / download / remove だけ必要。
 */

export interface StorageFileMetadata {
  id: string;
  workspace_id: string;
  filename: string;
  content_type: string;
  size: number;
  metadata: unknown | null;
  created_at: string;
  updated_at: string;
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: BodyInit;
  headers?: Record<string, string>;
}

async function rawFetch(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const bearer = await getAccessToken();
  return fetch(`${D6E_API_URL}${path}`, {
    method: options.method ?? "GET",
    body: options.body,
    headers: {
      Authorization: `Bearer ${bearer}`,
      ...options.headers,
    },
    cache: "no-store",
  });
}

async function jsonRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res = await rawFetch(path, options);
  if (!res.ok) {
    let message = `d6e files API error: ${res.status}`;
    let code = "";
    try {
      const body = (await res.json()) as {
        error?: string;
        message?: string;
        code?: string;
      };
      message = body.error ?? body.message ?? message;
      code = body.code ?? "";
    } catch {
      // non-json body
    }
    throw new D6eApiError(message, res.status, code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function filesBase(workspaceId: string = D6E_WORKSPACE_ID): string {
  return `/api/v1/workspaces/${workspaceId}/files`;
}

/** ワークスペース内のファイル一覧 (最新順) */
export async function listFiles(options?: {
  workspaceId?: string;
}): Promise<StorageFileMetadata[]> {
  return jsonRequest<StorageFileMetadata[]>(filesBase(options?.workspaceId));
}

/** 単一ファイルのメタデータ */
export async function getFileMetadata(
  id: string,
  options?: { workspaceId?: string },
): Promise<StorageFileMetadata> {
  return jsonRequest<StorageFileMetadata>(
    `${filesBase(options?.workspaceId)}/${encodeURIComponent(id)}`,
  );
}

/**
 * ファイルバイナリを取得する (ダウンロードプロキシ用)。
 * d6e はレスポンスヘッダに Content-Type / Content-Disposition / Content-Length を
 * 付けて返すので、それらを透過して Next.js 側でクライアントに渡す。
 */
export async function downloadFile(
  id: string,
  options?: { workspaceId?: string },
): Promise<Response> {
  const res = await rawFetch(
    `${filesBase(options?.workspaceId)}/${encodeURIComponent(id)}/download`,
  );
  if (!res.ok) {
    let message = `d6e download error: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // non-json body
    }
    throw new D6eApiError(message, res.status);
  }
  return res;
}

/** ソフト削除 (d6e 側で deleted_at をセット) */
export async function removeFile(
  id: string,
  options?: { workspaceId?: string },
): Promise<void> {
  await jsonRequest(
    `${filesBase(options?.workspaceId)}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

/**
 * Base64 JSON でアップロード (エッジ側からの fallback 用)。
 * 通常は STF コンテナ内で upload するのでこのパスは使わない。
 */
export async function uploadJson(input: {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
  workspaceId?: string;
}): Promise<StorageFileMetadata> {
  const base64 = Buffer.from(input.bytes).toString("base64");
  return jsonRequest<StorageFileMetadata>(filesBase(input.workspaceId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: input.filename,
      content_type: input.contentType,
      content: base64,
    }),
  });
}
