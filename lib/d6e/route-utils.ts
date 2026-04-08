import "server-only";

import { NextResponse } from "next/server";

import { D6eApiError } from "./client";

/**
 * Convert an unknown thrown value from a d6e repo call into a safe
 * JSON error response. Route handlers should wrap repo calls in
 * try/catch and delegate here — this keeps the routes tiny and avoids
 * leaking internal error messages to the client while still giving
 * actionable logs server-side.
 */
export function d6eErrorResponse(err: unknown): NextResponse {
  if (err instanceof D6eApiError) {
    console.error(`[d6e] ${err.code || "ERROR"}: ${err.message}`);
    // POLICY_DENIED and DDL_FORBIDDEN are client-attributable: map to
    // 403. Other d6e statuses pass through (400, 404, 500, ...).
    const status =
      err.code === "POLICY_DENIED" || err.code === "DDL_FORBIDDEN"
        ? 403
        : err.status || 500;
    return NextResponse.json(
      { error: err.message, code: err.code || undefined },
      { status },
    );
  }

  console.error(`[d6e] unexpected error:`, err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
