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
 * Important: d6e-api **auto-prefixes** workspace tables. The user-facing
 * SQL must reference tables by their **unprefixed** logical name (e.g.
 * `"banks"`), and the server rewrites it to
 * `user_data.ws_<workspace_id>_banks` before execution. Passing a fully
 * prefixed name from this side hits a 23-character validation cap and
 * is rejected. The escape logic and prefix handling are ported from
 * d6e-frontend so behaviour matches the server's expectations exactly.
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
 * Build a SQL identifier reference to a workspace-scoped table.
 *
 * Returns the **unprefixed** quoted name. d6e-api will resolve it to the
 * workspace's actual table at execution time.
 *
 * Example: `tableRef("companies")`  →  `"companies"`
 *          d6e-api executes against:  `user_data."ws_019c94f0_..._companies"`
 *
 * `tableName` MUST be a constant from repo modules — never user input.
 */
export function tableRef(tableName: string): string {
  return `"${escapeSqlIdentifier(tableName)}"`;
}

/**
 * Compute the fully-prefixed table name as a STRING VALUE (not an
 * identifier). Use this only when the table name needs to appear as a
 * string literal in a query — typically `information_schema.tables`
 * lookups, where d6e-api will not auto-prefix.
 *
 * Example: `workspaceTableNameValue("companies")`
 *       → `ws_019c94f0_33ea_7392_831a_021b1143f12f_companies`
 */
export function workspaceTableNameValue(
  tableName: string,
  workspaceId: string = D6E_WORKSPACE_ID,
): string {
  return `${workspaceTablePrefix(workspaceId)}${tableName}`;
}
