import "server-only";

import type {
  BuyerCandidate,
  Seller,
  SellerDocument,
  SellerInput,
  SellerMinute,
} from "@/lib/sellers";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";
import {
  toBuyerSource,
  toBuyerStatus,
  toMediatorType,
  toSellerRank,
  toSellerStage,
} from "./_enums";

/**
 * d6e-backed repository for the seller aggregate.
 *
 * The `Seller` type is an aggregate that spans four tables:
 *   sellers                  — core fields (name, stage, profile, …)
 *   meeting_minutes          — SellerMinute[] (seller_id FK)
 *   seller_documents         — SellerDocument[] (new table)
 *   seller_buyer_candidates  — BuyerCandidate[] (new table)
 *
 * Reads assemble the nested arrays from related tables after fetching
 * the core row. Sub-resource mutations (addMinute, addBuyer, …) write
 * to the related table then re-fetch the full aggregate to mirror the
 * legacy lib/sellers API shape.
 *
 * Fields not yet surfaced by the d6e sellers table (description,
 * profile, desiredTerms, stage) are backed by the columns added for
 * edinet-ma in an earlier migration.
 */

interface SellerRow {
  id: string;
  company_name: string;
  company_id: string | null;
  industry: string | null;
  prefecture: string | null;
  description: string | null;
  profile: string | null;
  desired_terms: string | null;
  stage: string | null;
  priority: string | null;
  rank: string | null;
  assigned_to: string | null;
  mediator_type: string | null;
  intro_source: string | null;
  fee_estimate: string | null;
  nda_signed: boolean | null;
  ad_signed: boolean | null;
  folder_url: string | null;
  created_at: string;
  updated_at: string;
}

interface MinuteRow {
  id: string;
  seller_id: string;
  title: string;
  meeting_date: string;
  attendees: string[] | null;
  content: string | null;
  created_at: string;
}

interface DocumentRow {
  id: string;
  seller_id: string;
  title: string;
  content: string | null;
  uploaded_at: string;
}

interface BuyerRow {
  id: string;
  seller_id: string;
  company_code: string | null;
  company_name: string;
  industry: string | null;
  source: string;
  reasoning: string | null;
  status: string;
  added_at: string;
  updated_at: string;
}

const SELLER_COLUMNS =
  "id, company_name, company_id, industry, prefecture, description, profile, desired_terms, stage, priority, rank, assigned_to, mediator_type, intro_source, fee_estimate, nda_signed, ad_signed, folder_url, created_at, updated_at";

// ---- Row → aggregate helpers ----

function rowToMinute(row: MinuteRow): SellerMinute {
  return {
    id: row.id,
    title: row.title,
    date: row.meeting_date,
    participants: Array.isArray(row.attendees) ? row.attendees : [],
    content: row.content ?? "",
    createdAt: row.created_at,
  };
}

function rowToDocument(row: DocumentRow): SellerDocument {
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? "",
    uploadedAt: row.uploaded_at,
  };
}

function rowToBuyer(row: BuyerRow): BuyerCandidate {
  return {
    id: row.id,
    companyCode: row.company_code ?? "",
    companyName: row.company_name,
    ...(row.industry ? { industry: row.industry } : {}),
    source: toBuyerSource(row.source),
    reasoning: row.reasoning ?? "",
    status: toBuyerStatus(row.status),
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

function rowToSeller(
  row: SellerRow,
  minutes: SellerMinute[],
  documents: SellerDocument[],
  buyers: BuyerCandidate[],
): Seller {
  const rank = toSellerRank(row.rank);
  const mediatorType = toMediatorType(row.mediator_type);
  return {
    id: row.id,
    companyName: row.company_name,
    ...(row.company_id ? { companyCode: row.company_id } : {}),
    ...(row.industry ? { industry: row.industry } : {}),
    ...(row.prefecture ? { prefecture: row.prefecture } : {}),
    description: row.description ?? "",
    profile: row.profile ?? "",
    desiredTerms: row.desired_terms ?? "",
    stage: toSellerStage(row.stage),
    ...(row.priority ? { priority: row.priority } : {}),
    ...(rank ? { rank } : {}),
    ...(row.assigned_to ? { assignedTo: row.assigned_to } : {}),
    ...(mediatorType ? { mediatorType } : {}),
    ...(row.intro_source ? { introSource: row.intro_source } : {}),
    ...(row.fee_estimate ? { feeEstimate: row.fee_estimate } : {}),
    ndaSigned: row.nda_signed ?? false,
    adSigned: row.ad_signed ?? false,
    ...(row.folder_url ? { folderUrl: row.folder_url } : {}),
    minutes,
    documents,
    buyers,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- Batch loaders for nested arrays ----

async function loadMinutesBySeller(
  sellerIds: string[],
): Promise<Map<string, SellerMinute[]>> {
  if (sellerIds.length === 0) return new Map();
  const inList = sellerIds.map((id) => escapeSqlValue(id)).join(", ");
  const result = await executeSql<MinuteRow>(
    `SELECT id, seller_id, title, meeting_date, attendees, content, created_at
     FROM ${tableRef("meeting_minutes")}
     WHERE seller_id IN (${inList})
     ORDER BY meeting_date DESC, created_at DESC`,
  );
  const grouped = new Map<string, SellerMinute[]>();
  for (const row of result.rows ?? []) {
    const list = grouped.get(row.seller_id) ?? [];
    list.push(rowToMinute(row));
    grouped.set(row.seller_id, list);
  }
  return grouped;
}

async function loadDocumentsBySeller(
  sellerIds: string[],
): Promise<Map<string, SellerDocument[]>> {
  if (sellerIds.length === 0) return new Map();
  const inList = sellerIds.map((id) => escapeSqlValue(id)).join(", ");
  const result = await executeSql<DocumentRow>(
    `SELECT id, seller_id, title, content, uploaded_at
     FROM ${tableRef("seller_documents")}
     WHERE seller_id IN (${inList})
     ORDER BY uploaded_at DESC`,
  );
  const grouped = new Map<string, SellerDocument[]>();
  for (const row of result.rows ?? []) {
    const list = grouped.get(row.seller_id) ?? [];
    list.push(rowToDocument(row));
    grouped.set(row.seller_id, list);
  }
  return grouped;
}

async function loadBuyersBySeller(
  sellerIds: string[],
): Promise<Map<string, BuyerCandidate[]>> {
  if (sellerIds.length === 0) return new Map();
  const inList = sellerIds.map((id) => escapeSqlValue(id)).join(", ");
  const result = await executeSql<BuyerRow>(
    `SELECT id, seller_id, company_code, company_name, industry, source, reasoning, status, added_at, updated_at
     FROM ${tableRef("seller_buyer_candidates")}
     WHERE seller_id IN (${inList})
     ORDER BY added_at`,
  );
  const grouped = new Map<string, BuyerCandidate[]>();
  for (const row of result.rows ?? []) {
    const list = grouped.get(row.seller_id) ?? [];
    list.push(rowToBuyer(row));
    grouped.set(row.seller_id, list);
  }
  return grouped;
}

async function assembleSellers(rows: SellerRow[]): Promise<Seller[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [minutesMap, documentsMap, buyersMap] = await Promise.all([
    loadMinutesBySeller(ids),
    loadDocumentsBySeller(ids),
    loadBuyersBySeller(ids),
  ]);
  return rows.map((row) =>
    rowToSeller(
      row,
      minutesMap.get(row.id) ?? [],
      documentsMap.get(row.id) ?? [],
      buyersMap.get(row.id) ?? [],
    ),
  );
}

// ---- Reads ----

export async function findAll(): Promise<Seller[]> {
  const result = await executeSql<SellerRow>(
    `SELECT ${SELLER_COLUMNS} FROM ${tableRef("sellers")} ORDER BY updated_at DESC`,
  );
  return assembleSellers(result.rows ?? []);
}

export async function findById(id: string): Promise<Seller | null> {
  const result = await executeSql<SellerRow>(
    `SELECT ${SELLER_COLUMNS} FROM ${tableRef("sellers")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const rows = result.rows ?? [];
  if (rows.length === 0) return null;
  const [seller] = await assembleSellers(rows);
  return seller ?? null;
}

// ---- Writes: core seller ----

export async function create(input: SellerInput): Promise<Seller> {
  const id = crypto.randomUUID();
  const result = await executeSql(
    `INSERT INTO ${tableRef("sellers")}
       (id, company_name, industry, prefecture, description, profile, desired_terms, stage,
        priority, rank, assigned_to, mediator_type, intro_source, fee_estimate,
        nda_signed, ad_signed, folder_url)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(input.companyName)},
       ${escapeSqlValue(input.industry)},
       ${escapeSqlValue(input.prefecture)},
       ${escapeSqlValue(input.description)},
       ${escapeSqlValue(input.profile)},
       ${escapeSqlValue(input.desiredTerms)},
       ${escapeSqlValue(input.stage)},
       ${escapeSqlValue(input.priority)},
       ${escapeSqlValue(input.rank)},
       ${escapeSqlValue(input.assignedTo)},
       ${escapeSqlValue(input.mediatorType)},
       ${escapeSqlValue(input.introSource)},
       ${escapeSqlValue(input.feeEstimate)},
       ${escapeSqlValue(input.ndaSigned ?? false)},
       ${escapeSqlValue(input.adSigned ?? false)},
       ${escapeSqlValue(input.folderUrl)}
     )`,
  );
  if ((result.affected_rows ?? 0) < 1) {
    throw new D6eApiError("INSERT affected 0 rows", 500, "INSERT_NO_EFFECT");
  }
  const created = await findById(id);
  if (!created) {
    throw new D6eApiError(
      "INSERT succeeded but row not found",
      500,
      "INSERT_VERIFY_FAILED",
    );
  }
  return created;
}

export async function update(
  id: string,
  patch: Partial<SellerInput>,
): Promise<Seller | null> {
  const assignments: string[] = [];
  if (patch.companyName !== undefined)
    assignments.push(`company_name = ${escapeSqlValue(patch.companyName)}`);
  if (patch.industry !== undefined)
    assignments.push(`industry = ${escapeSqlValue(patch.industry)}`);
  if (patch.prefecture !== undefined)
    assignments.push(`prefecture = ${escapeSqlValue(patch.prefecture)}`);
  if (patch.description !== undefined)
    assignments.push(`description = ${escapeSqlValue(patch.description)}`);
  if (patch.profile !== undefined)
    assignments.push(`profile = ${escapeSqlValue(patch.profile)}`);
  if (patch.desiredTerms !== undefined)
    assignments.push(`desired_terms = ${escapeSqlValue(patch.desiredTerms)}`);
  if (patch.stage !== undefined)
    assignments.push(`stage = ${escapeSqlValue(patch.stage)}`);
  if (patch.priority !== undefined)
    assignments.push(`priority = ${escapeSqlValue(patch.priority)}`);
  if (patch.rank !== undefined)
    assignments.push(`rank = ${escapeSqlValue(patch.rank)}`);
  if (patch.assignedTo !== undefined)
    assignments.push(`assigned_to = ${escapeSqlValue(patch.assignedTo)}`);
  if (patch.mediatorType !== undefined)
    assignments.push(`mediator_type = ${escapeSqlValue(patch.mediatorType)}`);
  if (patch.introSource !== undefined)
    assignments.push(`intro_source = ${escapeSqlValue(patch.introSource)}`);
  if (patch.feeEstimate !== undefined)
    assignments.push(`fee_estimate = ${escapeSqlValue(patch.feeEstimate)}`);
  if (patch.ndaSigned !== undefined)
    assignments.push(`nda_signed = ${patch.ndaSigned ? "TRUE" : "FALSE"}`);
  if (patch.adSigned !== undefined)
    assignments.push(`ad_signed = ${patch.adSigned ? "TRUE" : "FALSE"}`);
  if (patch.folderUrl !== undefined)
    assignments.push(`folder_url = ${escapeSqlValue(patch.folderUrl)}`);

  if (assignments.length === 0) return findById(id);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("sellers")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  // meeting_minutes / seller_documents / seller_buyer_candidates all
  // cascade-delete via FK; no manual cleanup needed.
  const result = await executeSql(
    `DELETE FROM ${tableRef("sellers")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}

// ---- Minute sub-resource ----

export async function addMinute(
  sellerId: string,
  input: Omit<SellerMinute, "id" | "createdAt">,
): Promise<Seller | null> {
  const id = crypto.randomUUID();
  await executeSql(
    `INSERT INTO ${tableRef("meeting_minutes")}
       (id, seller_id, title, meeting_date, attendees, content)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(sellerId)},
       ${escapeSqlValue(input.title)},
       ${escapeSqlValue(input.date)},
       ${escapeSqlValue(input.participants, "ARRAY", "_text")},
       ${escapeSqlValue(input.content)}
     )`,
  );
  return findById(sellerId);
}

export async function deleteMinute(
  sellerId: string,
  minuteId: string,
): Promise<Seller | null> {
  await executeSql(
    `DELETE FROM ${tableRef("meeting_minutes")}
     WHERE id = ${escapeSqlValue(minuteId)}
       AND seller_id = ${escapeSqlValue(sellerId)}`,
  );
  return findById(sellerId);
}

// ---- Document sub-resource ----

export async function addDocument(
  sellerId: string,
  input: Omit<SellerDocument, "id" | "uploadedAt">,
): Promise<Seller | null> {
  const id = crypto.randomUUID();
  await executeSql(
    `INSERT INTO ${tableRef("seller_documents")} (id, seller_id, title, content)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(sellerId)},
       ${escapeSqlValue(input.title)},
       ${escapeSqlValue(input.content)}
     )`,
  );
  return findById(sellerId);
}

export async function deleteDocument(
  sellerId: string,
  documentId: string,
): Promise<Seller | null> {
  await executeSql(
    `DELETE FROM ${tableRef("seller_documents")}
     WHERE id = ${escapeSqlValue(documentId)}
       AND seller_id = ${escapeSqlValue(sellerId)}`,
  );
  return findById(sellerId);
}

// ---- Buyer candidate sub-resource ----

export async function addBuyer(
  sellerId: string,
  input: Omit<BuyerCandidate, "id" | "addedAt" | "updatedAt">,
): Promise<Seller | null> {
  // Preserve legacy dedup: skip if an existing candidate matches by
  // companyCode (when present) or by companyName. Build the OR
  // branches as an array so the SQL stays well-formed regardless of
  // whether companyCode is provided.
  const orBranches = [`company_name = ${escapeSqlValue(input.companyName)}`];
  if (input.companyCode) {
    orBranches.unshift(`company_code = ${escapeSqlValue(input.companyCode)}`);
  }
  const existing = await executeSql<{ id: string }>(
    `SELECT id FROM ${tableRef("seller_buyer_candidates")}
     WHERE seller_id = ${escapeSqlValue(sellerId)}
       AND (${orBranches.join(" OR ")})
     LIMIT 1`,
  );
  if (existing.rows && existing.rows.length > 0) {
    return findById(sellerId);
  }

  const id = crypto.randomUUID();
  await executeSql(
    `INSERT INTO ${tableRef("seller_buyer_candidates")}
       (id, seller_id, company_code, company_name, industry, source, reasoning, status)
     VALUES (
       ${escapeSqlValue(id)},
       ${escapeSqlValue(sellerId)},
       ${escapeSqlValue(input.companyCode)},
       ${escapeSqlValue(input.companyName)},
       ${escapeSqlValue(input.industry)},
       ${escapeSqlValue(input.source)},
       ${escapeSqlValue(input.reasoning)},
       ${escapeSqlValue(input.status)}
     )`,
  );
  return findById(sellerId);
}

export async function updateBuyer(
  sellerId: string,
  buyerId: string,
  patch: Partial<Omit<BuyerCandidate, "id" | "addedAt">>,
): Promise<Seller | null> {
  const assignments: string[] = [];
  if (patch.companyCode !== undefined)
    assignments.push(`company_code = ${escapeSqlValue(patch.companyCode)}`);
  if (patch.companyName !== undefined)
    assignments.push(`company_name = ${escapeSqlValue(patch.companyName)}`);
  if (patch.industry !== undefined)
    assignments.push(`industry = ${escapeSqlValue(patch.industry)}`);
  if (patch.source !== undefined)
    assignments.push(`source = ${escapeSqlValue(patch.source)}`);
  if (patch.reasoning !== undefined)
    assignments.push(`reasoning = ${escapeSqlValue(patch.reasoning)}`);
  if (patch.status !== undefined)
    assignments.push(`status = ${escapeSqlValue(patch.status)}`);

  if (assignments.length === 0) return findById(sellerId);
  assignments.push("updated_at = now()");

  await executeSql(
    `UPDATE ${tableRef("seller_buyer_candidates")} SET ${assignments.join(", ")}
     WHERE id = ${escapeSqlValue(buyerId)}
       AND seller_id = ${escapeSqlValue(sellerId)}`,
  );
  return findById(sellerId);
}

export async function deleteBuyer(
  sellerId: string,
  buyerId: string,
): Promise<Seller | null> {
  await executeSql(
    `DELETE FROM ${tableRef("seller_buyer_candidates")}
     WHERE id = ${escapeSqlValue(buyerId)}
       AND seller_id = ${escapeSqlValue(sellerId)}`,
  );
  return findById(sellerId);
}
