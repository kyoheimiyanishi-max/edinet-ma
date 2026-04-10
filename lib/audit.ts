import "server-only";

import { executeSql } from "@/lib/d6e/client";
import { escapeSqlValue, tableRef } from "@/lib/d6e/sql";
import type { AppUser } from "@/lib/auth/session";

/**
 * 監査ログ: 誰がいつ何を変更したかを記録する。
 *
 * API route handler から呼ばれ、非同期で d6e の audit_log テーブルに
 * 書き込む。書き込み失敗しても呼び出し元の処理は止めない (best-effort)。
 */

export type AuditAction = "create" | "update" | "delete";

export interface AuditEntry {
  id: string;
  userEmail: string;
  userName?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  changes?: Record<string, unknown>;
  createdAt: string;
}

/** 2 つのオブジェクトの差分を { field: { old, new } } 形式で返す */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> | null {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  // 差分計算から除外するフィールド (メタデータ / ネストしたサブリソース)
  const skip = new Set([
    "createdAt",
    "updatedAt",
    "minutes",
    "documents",
    "buyers",
    "tasks",
  ]);
  for (const key of keys) {
    if (skip.has(key)) continue;
    const b = before[key];
    const a = after[key];
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diff[key] = { old: b, new: a };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}

/**
 * 監査ログを書き込む。
 *
 * @param user     現在のユーザー (null なら匿名として記録)
 * @param action   操作種別
 * @param entityType "seller" | "event" | "time_entry" 等
 * @param entityId UUID
 * @param entityLabel 人間が読めるラベル (会社名等)
 * @param changes  UPDATE 時の差分 (computeChanges の戻り値)
 */
export async function writeAudit(
  user: AppUser | null,
  action: AuditAction,
  entityType: string,
  entityId: string,
  entityLabel?: string,
  changes?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await executeSql(
      `INSERT INTO ${tableRef("audit_log")}
         (id, user_email, user_name, action, entity_type, entity_id, entity_label, changes)
       VALUES (
         ${escapeSqlValue(crypto.randomUUID())},
         ${escapeSqlValue(user?.email ?? "anonymous")},
         ${escapeSqlValue(user?.name)},
         ${escapeSqlValue(action)},
         ${escapeSqlValue(entityType)},
         ${escapeSqlValue(entityId)},
         ${escapeSqlValue(entityLabel)},
         ${escapeSqlValue(changes, "jsonb")}
       )`,
    );
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}

/** 特定エンティティの監査ログを取得 */
export async function findAuditByEntity(
  entityType: string,
  entityId: string,
): Promise<AuditEntry[]> {
  const result = await executeSql<{
    id: string;
    user_email: string;
    user_name: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    entity_label: string | null;
    changes: Record<string, unknown> | null;
    created_at: string;
  }>(
    `SELECT id, user_email, user_name, action, entity_type, entity_id, entity_label, changes, created_at
     FROM ${tableRef("audit_log")}
     WHERE entity_type = ${escapeSqlValue(entityType)}
       AND entity_id = ${escapeSqlValue(entityId)}
     ORDER BY created_at DESC
     LIMIT 100`,
  );
  return (result.rows ?? []).map((r) => ({
    id: r.id,
    userEmail: r.user_email,
    ...(r.user_name ? { userName: r.user_name } : {}),
    action: r.action as AuditAction,
    entityType: r.entity_type,
    entityId: r.entity_id,
    ...(r.entity_label ? { entityLabel: r.entity_label } : {}),
    ...(r.changes ? { changes: r.changes } : {}),
    createdAt: r.created_at,
  }));
}

/** 直近の監査ログを取得 (KPI / 活動ログ用) */
export async function findRecentAudit(limit = 50): Promise<AuditEntry[]> {
  const result = await executeSql<{
    id: string;
    user_email: string;
    user_name: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    entity_label: string | null;
    changes: Record<string, unknown> | null;
    created_at: string;
  }>(
    `SELECT id, user_email, user_name, action, entity_type, entity_id, entity_label, changes, created_at
     FROM ${tableRef("audit_log")}
     ORDER BY created_at DESC
     LIMIT ${limit}`,
  );
  return (result.rows ?? []).map((r) => ({
    id: r.id,
    userEmail: r.user_email,
    ...(r.user_name ? { userName: r.user_name } : {}),
    action: r.action as AuditAction,
    entityType: r.entity_type,
    entityId: r.entity_id,
    ...(r.entity_label ? { entityLabel: r.entity_label } : {}),
    ...(r.changes ? { changes: r.changes } : {}),
    createdAt: r.created_at,
  }));
}
