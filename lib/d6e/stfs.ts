import "server-only";

import { getAccessToken } from "./auth";
import { D6eApiError } from "./client";
import { D6E_API_URL, D6E_WORKSPACE_ID } from "./config";

/**
 * d6e STF (Step Template Framework) クライアント
 *
 * Docker Runtime の STF を instant-run で実行する。
 *   POST /api/v1/workspaces/:workspace_id/stfs/instant-run
 *
 * 2 つのモードを両方サポート:
 *
 * 1. stf_version_id モード (推奨・本番):
 *    d6e に事前登録した STF のバージョン ID を指定して実行する。
 *    STF に設定されたポリシーがそのまま適用される。
 *
 * 2. code モード (開発・フォールバック):
 *    Docker 設定 JSON を base64 化して直接送る。STF 登録不要で動作確認
 *    できるが、ポリシーが User サブジェクトで評価されるため storage_file
 *    への書込権限が呼出しユーザーに付与されている必要がある。
 */

export interface StfInstantRunResponse<Output = unknown> {
  success: boolean;
  output?: Output;
  error?: string;
}

interface InstantRunByVersion {
  stfVersionId: string;
  input?: unknown;
  sources?: Record<string, unknown>;
}

interface InstantRunByCode {
  /** Docker image 参照。例: ghcr.io/gyact/edinet-ma-nonname:v0.1.0 */
  image: string;
  command?: string[];
  env?: Record<string, string>;
  input?: unknown;
  sources?: Record<string, unknown>;
}

type InstantRunArgs = (InstantRunByVersion | InstantRunByCode) & {
  workspaceId?: string;
};

function isByVersion(args: InstantRunArgs): args is InstantRunByVersion & {
  workspaceId?: string;
} {
  return "stfVersionId" in args;
}

/**
 * STF を instant-run で 1 回実行する。
 * 返り値はコンテナが stdout に出した JSON の `output` フィールド。
 */
export async function instantRunStf<Output = unknown>(
  args: InstantRunArgs,
): Promise<Output> {
  const bearer = await getAccessToken();
  const workspaceId = args.workspaceId ?? D6E_WORKSPACE_ID;
  const url = `${D6E_API_URL}/api/v1/workspaces/${workspaceId}/stfs/instant-run`;

  const body: Record<string, unknown> = {
    input: args.input ?? {},
    sources: args.sources ?? {},
  };

  if (isByVersion(args)) {
    body.stf_version_id = args.stfVersionId;
  } else {
    const codeJson: Record<string, unknown> = { image: args.image };
    if (args.command) codeJson.command = args.command;
    if (args.env) codeJson.env = args.env;
    body.runtime = "docker";
    body.code = Buffer.from(JSON.stringify(codeJson), "utf-8").toString(
      "base64",
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `d6e STF instant-run error: ${res.status}`;
    let code = "";
    try {
      const err = (await res.json()) as {
        error?: string;
        message?: string;
        code?: string;
      };
      message = err.error ?? err.message ?? message;
      code = err.code ?? "";
    } catch {
      // ignore
    }
    throw new D6eApiError(message, res.status, code);
  }

  const payload = (await res.json()) as StfInstantRunResponse<Output>;
  if (!payload.success) {
    throw new D6eApiError(
      payload.error ?? "STF execution failed",
      500,
      "STF_EXECUTION_FAILED",
    );
  }
  if (payload.output === undefined) {
    throw new D6eApiError("STF returned no output", 500, "STF_EMPTY_OUTPUT");
  }
  return payload.output;
}
