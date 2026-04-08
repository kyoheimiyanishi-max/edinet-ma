import "server-only";

import { getAccessToken } from "./auth";
import { D6E_API_URL, D6E_WORKSPACE_ID } from "./config";

/**
 * Typed HTTP client for d6e-api.
 *
 * d6e-api expects `Authorization: Bearer <JWT>` on every endpoint.
 * The JWT is issued by d6e-auth (https://www.d6e.ai). The `./auth`
 * module handles refreshing the token automatically using the
 * OAuth2 refresh-token grant; see that file for the full lifecycle.
 */

export class D6eApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = "") {
    super(message);
    this.name = "D6eApiError";
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: string;
  headers?: Record<string, string>;
}

export { getAccessToken };

async function apiRequest<T>(
  path: string,
  token: string | undefined,
  options: RequestOptions = {},
): Promise<T> {
  const bearer = await getAccessToken(token);
  const response = await fetch(`${D6E_API_URL}${path}`, {
    method: options.method ?? "GET",
    body: options.body,
    headers: {
      Authorization: `Bearer ${bearer}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorMessage = `d6e API error: ${response.status}`;
    let errorCode = "";
    try {
      const body = (await response.json()) as {
        error?: string;
        message?: string;
        code?: string;
      };
      errorMessage = body.error ?? body.message ?? errorMessage;
      errorCode = body.code ?? "";
    } catch {
      // body was not JSON; keep default message
    }

    if (errorCode === "POLICY_DENIED") {
      throw new D6eApiError(
        `Permission denied: ${errorMessage}`,
        response.status,
        errorCode,
      );
    }
    if (errorCode === "DDL_FORBIDDEN") {
      throw new D6eApiError(
        `DDL operation not allowed by d6e: ${errorMessage}`,
        response.status,
        errorCode,
      );
    }
    throw new D6eApiError(errorMessage, response.status, errorCode);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// ---- SQL execution ----

export interface SqlResult<Row = Record<string, unknown>> {
  /** Present for SELECT statements. */
  rows?: Row[];
  /** Present for INSERT/UPDATE/DELETE. d6e-api strips `RETURNING` clauses. */
  affected_rows?: number;
  /** The query as actually executed by d6e (after policy injection). */
  executed_sql?: string;
  // d6e-api may return additional metadata. We capture unknowns loosely
  // so future fields don't break callers.
  [key: string]: unknown;
}

/**
 * Execute a raw SQL statement against the workspace's user_data schema.
 * Use the helpers in `./sql` to build identifier and value fragments.
 *
 * d6e enforces:
 *   - DDL is rejected with `DDL_FORBIDDEN`
 *   - Cross-workspace access is rejected by row-level policies
 */
export async function executeSql<Row = Record<string, unknown>>(
  sql: string,
  options?: { token?: string; workspaceId?: string },
): Promise<SqlResult<Row>> {
  const workspaceId = options?.workspaceId ?? D6E_WORKSPACE_ID;
  return apiRequest<SqlResult<Row>>(
    `/api/v1/workspaces/${workspaceId}/sql`,
    options?.token,
    {
      method: "POST",
      body: JSON.stringify({ sql }),
    },
  );
}

// ---- Workspace metadata (rarely needed but useful for diagnostics) ----

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export async function listWorkspaces(token?: string): Promise<Workspace[]> {
  return apiRequest<Workspace[]>("/api/v1/workspaces", token);
}
