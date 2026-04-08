import "server-only";

import { D6E_API_URL, D6E_WORKSPACE_ID } from "./config";

/**
 * Typed HTTP client for d6e-api.
 *
 * d6e-api expects `Authorization: Bearer <JWT>` on every endpoint.
 * The JWT is issued by d6e-auth (https://www.d6e.ai). For local
 * development we read it from `D6E_DEV_ACCESS_TOKEN`. A real OAuth
 * flow will replace this in a follow-up.
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

/**
 * Resolve the access token used for the current request.
 *
 * Today: dev token from env. Tomorrow: per-request JWT from a session
 * cookie set by an OAuth callback. The signature already accepts an
 * explicit override so callers in route handlers can pass through a
 * user-scoped token without changing this module.
 */
export function getAccessToken(override?: string): string {
  if (override) return override;
  const token = process.env.D6E_DEV_ACCESS_TOKEN;
  if (!token) {
    throw new D6eApiError(
      "No d6e access token available. Set D6E_DEV_ACCESS_TOKEN in .env.local " +
        "(see Chrome DevTools → Cookies → jp-force.d6e.ai → 'auth-token').",
      401,
      "NO_TOKEN",
    );
  }
  return token;
}

async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${D6E_API_URL}${path}`, {
    method: options.method ?? "GET",
    body: options.body,
    headers: {
      Authorization: `Bearer ${token}`,
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
  rows: Row[];
  // d6e-api may return additional metadata (rowCount, etc.). We capture
  // unknowns loosely so future fields don't break callers.
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
  const token = getAccessToken(options?.token);
  const workspaceId = options?.workspaceId ?? D6E_WORKSPACE_ID;
  return apiRequest<SqlResult<Row>>(
    `/api/v1/workspaces/${workspaceId}/sql`,
    token,
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
  return apiRequest<Workspace[]>("/api/v1/workspaces", getAccessToken(token));
}
