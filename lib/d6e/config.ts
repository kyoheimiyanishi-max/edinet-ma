import "server-only";

/**
 * d6e platform configuration.
 *
 * d6e is a multi-tenant SaaS platform that hosts edinet-ma's data.
 * All persistent storage goes through `d6e-api` (Rust/axum) backed by
 * DigitalOcean Managed Postgres.
 *
 * Schemas live under the `user_data` schema, with table names prefixed
 * per workspace: `ws_<workspace_id_with_underscores>_<table>`.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See .env.example for the full list of d6e variables.`,
    );
  }
  return value;
}

export const D6E_API_URL = requireEnv("D6E_API_URL");

export const D6E_WORKSPACE_ID = requireEnv("D6E_WORKSPACE_ID");

/**
 * Convert a workspace UUID to the underscore form used as a table prefix.
 * d6e replaces hyphens with underscores in identifiers.
 *
 * Example: `019c94f0-33ea-7392-831a-021b1143f12f`
 *       → `019c94f0_33ea_7392_831a_021b1143f12f`
 */
export function workspaceTablePrefix(
  workspaceId: string = D6E_WORKSPACE_ID,
): string {
  return `ws_${workspaceId.replace(/-/g, "_")}_`;
}
