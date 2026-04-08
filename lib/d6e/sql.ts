import "server-only";

import { D6E_WORKSPACE_ID, workspaceTablePrefix } from "./config";

/**
 * SQL string-building helpers for d6e's `executeSql` endpoint.
 *
 * d6e-api accepts a single SQL string per request (no parameter binding),
 * so every value flowing into a query MUST go through `escapeSqlValue`
 * to avoid SQL injection. Identifier names should always come from
 * compile-time constants in repository modules — never from user input.
 *
 * The escape logic is ported from d6e-frontend so behaviour matches the
 * server's expectations exactly.
 */

export function escapeSqlIdentifier(identifier: string): string {
  return identifier.replace(/"/g, '""');
}

export function escapeSqlValue(
  value: unknown,
  dataType?: string,
  udtName?: string,
): string {
  if (value === null || value === undefined) return "NULL";
  if (value === "") return "NULL";

  if (dataType === "json" || dataType === "jsonb") {
    const jsonStr = typeof value === "string" ? value : JSON.stringify(value);
    return `'${jsonStr.replace(/'/g, "''")}'`;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }

  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";

  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }

  if (Array.isArray(value)) {
    let elementType: string | undefined;
    if (dataType === "ARRAY" && udtName?.startsWith("_")) {
      elementType = udtName.substring(1);
    } else if (dataType?.endsWith("[]")) {
      elementType = dataType.slice(0, -2);
    }
    const escaped = value.map((v) => escapeSqlValue(v, elementType));
    return `ARRAY[${escaped.join(", ")}]`;
  }

  if (typeof value === "object") {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  const escaped = String(value).replace(/'/g, "''");
  return `'${escaped}'`;
}

/**
 * Build the fully-qualified, quoted reference for a workspace-scoped table.
 *
 * Example: `qualifiedTable("companies")`
 *       → `user_data."ws_019c94f0_33ea_7392_831a_021b1143f12f_companies"`
 *
 * `tableName` MUST be a constant from repo modules — never user input.
 */
export function qualifiedTable(
  tableName: string,
  workspaceId: string = D6E_WORKSPACE_ID,
): string {
  const full = `${workspaceTablePrefix(workspaceId)}${tableName}`;
  return `user_data."${escapeSqlIdentifier(full)}"`;
}
