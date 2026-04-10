import "server-only";

import type {
  OutreachChannel,
  OutreachLog,
  OutreachLogInput,
  OutreachStatus,
  OutreachTemplate,
  OutreachTemplateInput,
} from "@/lib/outreach";
import { OUTREACH_CHANNELS, OUTREACH_STATUSES } from "@/lib/outreach";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";

/**
 * d6e-backed repository for outreach templates (送付用テンプレート)
 * and outreach logs (送付履歴).
 */

// ---- Templates ----

interface TemplateRow {
  id: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const TEMPLATE_COLUMNS =
  "id, name, channel, subject, body, description, created_at, updated_at";

function narrowChannel(v: string): OutreachChannel {
  if ((OUTREACH_CHANNELS as readonly string[]).includes(v)) {
    return v as OutreachChannel;
  }
  return "email";
}

function narrowStatus(v: string): OutreachStatus {
  if ((OUTREACH_STATUSES as readonly string[]).includes(v)) {
    return v as OutreachStatus;
  }
  return "sent";
}

function rowToTemplate(row: TemplateRow): OutreachTemplate {
  return {
    id: row.id,
    name: row.name,
    channel: narrowChannel(row.channel),
    ...(row.subject ? { subject: row.subject } : {}),
    body: row.body,
    ...(row.description ? { description: row.description } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findAllTemplates(): Promise<OutreachTemplate[]> {
  const result = await executeSql<TemplateRow>(
    `SELECT ${TEMPLATE_COLUMNS} FROM ${tableRef("outreach_templates")} ORDER BY created_at DESC`,
  );
  return (result.rows ?? []).map(rowToTemplate);
}

export async function findTemplateById(
  id: string,
): Promise<OutreachTemplate | null> {
  const result = await executeSql<TemplateRow>(
    `SELECT ${TEMPLATE_COLUMNS} FROM ${tableRef("outreach_templates")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToTemplate(row) : null;
}

export async function createTemplate(
  input: OutreachTemplateInput,
): Promise<OutreachTemplate> {
  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("outreach_templates")}
       (id, name, channel, subject, body, description)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(input.name)},
       ${escapeSqlValue(input.channel)},
       ${escapeSqlValue(input.subject)},
       ${escapeSqlValue(input.body)},
       ${escapeSqlValue(input.description)}
     )`,
  );
  if ((result.affected_rows ?? 0) < 1) {
    throw new D6eApiError("INSERT affected 0 rows", 500, "INSERT_NO_EFFECT");
  }
  const created = await findTemplateById(id);
  if (!created) {
    throw new D6eApiError(
      "INSERT succeeded but row not found",
      500,
      "INSERT_VERIFY_FAILED",
    );
  }
  return created;
}

export async function updateTemplate(
  id: string,
  patch: Partial<OutreachTemplateInput>,
): Promise<OutreachTemplate | null> {
  const assignments: string[] = [];
  if (patch.name !== undefined)
    assignments.push(`name = ${escapeSqlValue(patch.name)}`);
  if (patch.channel !== undefined)
    assignments.push(`channel = ${escapeSqlValue(patch.channel)}`);
  if (patch.subject !== undefined)
    assignments.push(`subject = ${escapeSqlValue(patch.subject)}`);
  if (patch.body !== undefined)
    assignments.push(`body = ${escapeSqlValue(patch.body)}`);
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);

  if (assignments.length === 0) return findTemplateById(id);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("outreach_templates")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findTemplateById(id);
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("outreach_templates")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}

// ---- Logs ----

interface LogRow {
  id: string;
  buyer_company_id: string | null;
  buyer_company_name: string | null;
  seller_id: string | null;
  seller_name: string | null;
  template_id: string | null;
  template_name: string | null;
  channel: string;
  subject: string | null;
  body: string | null;
  sent_at: string;
  sent_by: string | null;
  status: string;
  reply_text: string | null;
  notes: string | null;
  created_at: string;
}

const LOG_SELECT = `
  l.id, l.buyer_company_id, c.name AS buyer_company_name,
  l.seller_id, s.company_name AS seller_name,
  l.template_id, t.name AS template_name,
  l.channel, l.subject, l.body, l.sent_at, l.sent_by, l.status,
  l.reply_text, l.notes, l.created_at
`;

function logFrom(): string {
  return `${tableRef("outreach_log")} l
    LEFT JOIN ${tableRef("companies")} c ON c.id = l.buyer_company_id
    LEFT JOIN ${tableRef("sellers")} s ON s.id = l.seller_id
    LEFT JOIN ${tableRef("outreach_templates")} t ON t.id = l.template_id`;
}

function rowToLog(row: LogRow): OutreachLog {
  return {
    id: row.id,
    ...(row.buyer_company_id ? { buyerCompanyId: row.buyer_company_id } : {}),
    ...(row.buyer_company_name
      ? { buyerCompanyName: row.buyer_company_name }
      : {}),
    ...(row.seller_id ? { sellerId: row.seller_id } : {}),
    ...(row.seller_name ? { sellerName: row.seller_name } : {}),
    ...(row.template_id ? { templateId: row.template_id } : {}),
    ...(row.template_name ? { templateName: row.template_name } : {}),
    channel: narrowChannel(row.channel),
    ...(row.subject ? { subject: row.subject } : {}),
    ...(row.body ? { body: row.body } : {}),
    sentAt: row.sent_at,
    ...(row.sent_by ? { sentBy: row.sent_by } : {}),
    status: narrowStatus(row.status),
    ...(row.reply_text ? { replyText: row.reply_text } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    createdAt: row.created_at,
  };
}

export async function findAllLogs(limit = 500): Promise<OutreachLog[]> {
  const result = await executeSql<LogRow>(
    `SELECT ${LOG_SELECT} FROM ${logFrom()} ORDER BY l.sent_at DESC LIMIT ${limit}`,
  );
  return (result.rows ?? []).map(rowToLog);
}

export async function findLogById(id: string): Promise<OutreachLog | null> {
  const result = await executeSql<LogRow>(
    `SELECT ${LOG_SELECT} FROM ${logFrom()} WHERE l.id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToLog(row) : null;
}

export async function findLogsByBuyer(
  buyerCompanyId: string,
): Promise<OutreachLog[]> {
  const result = await executeSql<LogRow>(
    `SELECT ${LOG_SELECT} FROM ${logFrom()}
     WHERE l.buyer_company_id = ${escapeSqlValue(buyerCompanyId)}
     ORDER BY l.sent_at DESC`,
  );
  return (result.rows ?? []).map(rowToLog);
}

export async function findLogsBySeller(
  sellerId: string,
): Promise<OutreachLog[]> {
  const result = await executeSql<LogRow>(
    `SELECT ${LOG_SELECT} FROM ${logFrom()}
     WHERE l.seller_id = ${escapeSqlValue(sellerId)}
     ORDER BY l.sent_at DESC`,
  );
  return (result.rows ?? []).map(rowToLog);
}

export async function createLog(input: OutreachLogInput): Promise<OutreachLog> {
  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("outreach_log")}
       (id, buyer_company_id, seller_id, template_id, channel, subject, body, sent_by, status, reply_text, notes)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(input.buyerCompanyId)},
       ${escapeSqlValue(input.sellerId)},
       ${escapeSqlValue(input.templateId)},
       ${escapeSqlValue(input.channel)},
       ${escapeSqlValue(input.subject)},
       ${escapeSqlValue(input.body)},
       ${escapeSqlValue(input.sentBy)},
       ${escapeSqlValue(input.status ?? "sent")},
       ${escapeSqlValue(input.replyText)},
       ${escapeSqlValue(input.notes)}
     )`,
  );
  if ((result.affected_rows ?? 0) < 1) {
    throw new D6eApiError("INSERT affected 0 rows", 500, "INSERT_NO_EFFECT");
  }
  const created = await findLogById(id);
  if (!created) {
    throw new D6eApiError(
      "INSERT succeeded but row not found",
      500,
      "INSERT_VERIFY_FAILED",
    );
  }
  return created;
}

export async function updateLog(
  id: string,
  patch: Partial<OutreachLogInput>,
): Promise<OutreachLog | null> {
  const assignments: string[] = [];
  if (patch.buyerCompanyId !== undefined)
    assignments.push(
      `buyer_company_id = ${escapeSqlValue(patch.buyerCompanyId)}`,
    );
  if (patch.sellerId !== undefined)
    assignments.push(`seller_id = ${escapeSqlValue(patch.sellerId)}`);
  if (patch.templateId !== undefined)
    assignments.push(`template_id = ${escapeSqlValue(patch.templateId)}`);
  if (patch.channel !== undefined)
    assignments.push(`channel = ${escapeSqlValue(patch.channel)}`);
  if (patch.subject !== undefined)
    assignments.push(`subject = ${escapeSqlValue(patch.subject)}`);
  if (patch.body !== undefined)
    assignments.push(`body = ${escapeSqlValue(patch.body)}`);
  if (patch.sentBy !== undefined)
    assignments.push(`sent_by = ${escapeSqlValue(patch.sentBy)}`);
  if (patch.status !== undefined)
    assignments.push(`status = ${escapeSqlValue(patch.status)}`);
  if (patch.replyText !== undefined)
    assignments.push(`reply_text = ${escapeSqlValue(patch.replyText)}`);
  if (patch.notes !== undefined)
    assignments.push(`notes = ${escapeSqlValue(patch.notes)}`);

  if (assignments.length === 0) return findLogById(id);

  const result = await executeSql(
    `UPDATE ${tableRef("outreach_log")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findLogById(id);
}

export async function deleteLog(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("outreach_log")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}
