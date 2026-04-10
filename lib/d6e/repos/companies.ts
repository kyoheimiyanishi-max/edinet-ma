import "server-only";

import { D6eApiError, executeSql } from "../client";
import { escapeSqlValue, tableRef } from "../sql";
import { toListingStatus } from "./_enums";

/**
 * d6e-backed repository for the `companies` table.
 *
 * This complements (does NOT replace) the live API search in
 * `lib/unified-company.ts` which queries EDINET + gBizINFO. The d6e
 * companies table is intended as a CRM-style tracking layer:
 *
 *   - Seeded from `data/edinet-codelist.json` (~11k entries) so every
 *     EDINET-listed Japanese company is pre-tracked with its
 *     identifiers (corporate_number, edinet_code, sec_code).
 *   - Mutable flags (is_seller / is_buyer / is_prospect) and notes
 *     give users a place to mark companies of interest.
 *   - Lookups by corporate_number / edinet_code / sec_code let other
 *     features (sellers, projects, employee_assignments) FK-link to
 *     d6e companies for relational integrity.
 */

export type ListingStatus =
  | "listed"
  | "unlisted"
  | "tokyo_prime"
  | "tokyo_standard"
  | "tokyo_growth"
  | "other";

export type BuyerProspectStatus =
  | "未接触"
  | "アプローチ中"
  | "日程調整中"
  | "アポfix"
  | "アポ調整中"
  | "アポ実施済"
  | "NDAやり取り中"
  | "NDA締結"
  | "開拓済"
  | "開拓済（NDAなし）"
  | "開拓済（NDA締結済み）"
  | "ペンディング";

/** Excel のワークフロー順 (進行度の昇順) */
export const BUYER_PROSPECT_STATUSES: BuyerProspectStatus[] = [
  "未接触",
  "アプローチ中",
  "日程調整中",
  "アポfix",
  "アポ調整中",
  "アポ実施済",
  "NDAやり取り中",
  "NDA締結",
  "開拓済",
  "開拓済（NDAなし）",
  "開拓済（NDA締結済み）",
  "ペンディング",
];

/**
 * d6e-persisted company record (the CRM/tracking layer).
 *
 * There are three distinct `Company`-ish types in this codebase; keep
 * them straight when importing:
 *   - `Company` (this file) — rows from the d6e `companies` table
 *   - `UnifiedCompany` (`lib/unified-company.ts`) — merged view across
 *      the live EDINET + gBizINFO APIs used by the search page
 *   - `Company` (`lib/edinetdb.ts`) — raw EDINET DB API response
 */
export interface Company {
  id: string;
  name: string;
  nameEn?: string;
  nameKana?: string;
  corporateNumber?: string;
  edinetCode?: string;
  secCode?: string;
  industry?: string;
  industryDetail?: string;
  listingStatus?: ListingStatus;
  prefecture?: string;
  address?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  representative?: string;
  capital?: number;
  employeeCount?: number;
  foundedDate?: string;
  businessSummary?: string;
  notes?: string;
  isSeller: boolean;
  isBuyer: boolean;
  isProspect: boolean;
  // 買手開拓用の構造化カラム
  buyerStatus?: BuyerProspectStatus;
  strongBuyer: boolean;
  targetDeal?: string;
  lastApproachDate?: string;
  lastApproachMethod?: string;
  ndaDate?: string;
  buyerAssignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface CompanyRow {
  id: string;
  name: string;
  name_en: string | null;
  name_kana: string | null;
  corporate_number: string | null;
  edinet_code: string | null;
  sec_code: string | null;
  industry: string | null;
  industry_detail: string | null;
  listing_status: string | null;
  address: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  representative: string | null;
  capital: string | number | null;
  employee_count: number | null;
  founded_date: string | null;
  business_summary: string | null;
  notes: string | null;
  is_seller: boolean | null;
  is_buyer: boolean | null;
  is_prospect: boolean | null;
  buyer_status: string | null;
  strong_buyer: boolean | null;
  target_deal: string | null;
  last_approach_date: string | null;
  last_approach_method: string | null;
  nda_date: string | null;
  buyer_assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const SELECT_COLUMNS = `
  id, name, name_en, name_kana, corporate_number, edinet_code, sec_code,
  industry, industry_detail, listing_status, address, postal_code, phone,
  email, website, representative, capital, employee_count, founded_date,
  business_summary, notes, is_seller, is_buyer, is_prospect,
  buyer_status, strong_buyer, target_deal, last_approach_date,
  last_approach_method, nda_date, buyer_assigned_to,
  created_at, updated_at
`;

function toBuyerProspectStatus(
  v: string | null,
): BuyerProspectStatus | undefined {
  if (!v) return undefined;
  if ((BUYER_PROSPECT_STATUSES as readonly string[]).includes(v)) {
    return v as BuyerProspectStatus;
  }
  return undefined;
}

function rowToCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    ...(row.name_en ? { nameEn: row.name_en } : {}),
    ...(row.name_kana ? { nameKana: row.name_kana } : {}),
    ...(row.corporate_number ? { corporateNumber: row.corporate_number } : {}),
    ...(row.edinet_code ? { edinetCode: row.edinet_code } : {}),
    ...(row.sec_code ? { secCode: row.sec_code } : {}),
    ...(row.industry ? { industry: row.industry } : {}),
    ...(row.industry_detail ? { industryDetail: row.industry_detail } : {}),
    ...((): { listingStatus?: ListingStatus } => {
      const ls = toListingStatus(row.listing_status);
      return ls ? { listingStatus: ls } : {};
    })(),
    ...(row.address ? { address: row.address } : {}),
    ...(row.postal_code ? { postalCode: row.postal_code } : {}),
    ...(row.phone ? { phone: row.phone } : {}),
    ...(row.email ? { email: row.email } : {}),
    ...(row.website ? { website: row.website } : {}),
    ...(row.representative ? { representative: row.representative } : {}),
    ...(row.capital !== null ? { capital: Number(row.capital) } : {}),
    ...(row.employee_count !== null
      ? { employeeCount: row.employee_count }
      : {}),
    ...(row.founded_date ? { foundedDate: row.founded_date } : {}),
    ...(row.business_summary ? { businessSummary: row.business_summary } : {}),
    ...(row.notes ? { notes: row.notes } : {}),
    isSeller: row.is_seller ?? false,
    isBuyer: row.is_buyer ?? false,
    isProspect: row.is_prospect ?? false,
    ...((): { buyerStatus?: BuyerProspectStatus } => {
      const bs = toBuyerProspectStatus(row.buyer_status);
      return bs ? { buyerStatus: bs } : {};
    })(),
    strongBuyer: row.strong_buyer ?? false,
    ...(row.target_deal ? { targetDeal: row.target_deal } : {}),
    ...(row.last_approach_date
      ? { lastApproachDate: row.last_approach_date }
      : {}),
    ...(row.last_approach_method
      ? { lastApproachMethod: row.last_approach_method }
      : {}),
    ...(row.nda_date ? { ndaDate: row.nda_date } : {}),
    ...(row.buyer_assigned_to
      ? { buyerAssignedTo: row.buyer_assigned_to }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CompanyInput {
  name: string;
  nameEn?: string;
  nameKana?: string;
  corporateNumber?: string;
  edinetCode?: string;
  secCode?: string;
  industry?: string;
  industryDetail?: string;
  listingStatus?: ListingStatus;
  address?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  representative?: string;
  capital?: number;
  employeeCount?: number;
  foundedDate?: string;
  businessSummary?: string;
  notes?: string;
  isSeller?: boolean;
  isBuyer?: boolean;
  isProspect?: boolean;
  buyerStatus?: BuyerProspectStatus;
  strongBuyer?: boolean;
  targetDeal?: string;
  lastApproachDate?: string;
  lastApproachMethod?: string;
  ndaDate?: string;
  buyerAssignedTo?: string;
}

// ---- Reads ----

export async function findAll(limit = 200): Promise<Company[]> {
  const result = await executeSql<CompanyRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("companies")} ORDER BY name LIMIT ${limit}`,
  );
  return (result.rows ?? []).map(rowToCompany);
}

export async function findById(id: string): Promise<Company | null> {
  const result = await executeSql<CompanyRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("companies")} WHERE id = ${escapeSqlValue(id)}`,
  );
  const row = result.rows?.[0];
  return row ? rowToCompany(row) : null;
}

export async function findByCorporateNumber(
  corporateNumber: string,
): Promise<Company | null> {
  const result = await executeSql<CompanyRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("companies")} WHERE corporate_number = ${escapeSqlValue(corporateNumber)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToCompany(row) : null;
}

export async function findByEdinetCode(
  edinetCode: string,
): Promise<Company | null> {
  const result = await executeSql<CompanyRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("companies")} WHERE edinet_code = ${escapeSqlValue(edinetCode)} LIMIT 1`,
  );
  const row = result.rows?.[0];
  return row ? rowToCompany(row) : null;
}

export async function findBySecCode(secCode: string): Promise<Company[]> {
  const result = await executeSql<CompanyRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("companies")} WHERE sec_code = ${escapeSqlValue(secCode)}`,
  );
  return (result.rows ?? []).map(rowToCompany);
}

export interface CompanyFilters {
  query?: string;
  listingStatus?: ListingStatus;
  isSeller?: boolean;
  isBuyer?: boolean;
  isProspect?: boolean;
  buyerStatus?: BuyerProspectStatus;
  strongBuyer?: boolean;
  buyerAssignedTo?: string;
  limit?: number;
}

export async function search(filters: CompanyFilters = {}): Promise<Company[]> {
  const conditions: string[] = [];
  if (filters.query && filters.query.trim()) {
    // Escape both single quotes (SQL literal) and LIKE wildcards
    // (%, _) then pass through `escapeSqlValue` so the final literal
    // goes through the same escape path as every other value in the
    // repo layer. Keeps the injection-avoidance logic in one place.
    const escapedForLike = filters.query
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    const pattern = escapeSqlValue(`%${escapedForLike}%`);
    conditions.push(
      `(name ILIKE ${pattern} OR name_kana ILIKE ${pattern} OR name_en ILIKE ${pattern} OR industry_detail ILIKE ${pattern})`,
    );
  }
  if (filters.listingStatus) {
    conditions.push(
      `listing_status = ${escapeSqlValue(filters.listingStatus)}`,
    );
  }
  if (filters.isSeller !== undefined) {
    conditions.push(`is_seller = ${filters.isSeller ? "TRUE" : "FALSE"}`);
  }
  if (filters.isBuyer !== undefined) {
    conditions.push(`is_buyer = ${filters.isBuyer ? "TRUE" : "FALSE"}`);
  }
  if (filters.isProspect !== undefined) {
    conditions.push(`is_prospect = ${filters.isProspect ? "TRUE" : "FALSE"}`);
  }
  if (filters.buyerStatus) {
    conditions.push(`buyer_status = ${escapeSqlValue(filters.buyerStatus)}`);
  }
  if (filters.strongBuyer !== undefined) {
    conditions.push(`strong_buyer = ${filters.strongBuyer ? "TRUE" : "FALSE"}`);
  }
  if (filters.buyerAssignedTo) {
    conditions.push(
      `buyer_assigned_to = ${escapeSqlValue(filters.buyerAssignedTo)}`,
    );
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit ?? 200;

  const result = await executeSql<CompanyRow>(
    `SELECT ${SELECT_COLUMNS} FROM ${tableRef("companies")} ${where} ORDER BY name LIMIT ${limit}`,
  );
  return (result.rows ?? []).map(rowToCompany);
}

export async function countTracked(): Promise<{
  total: number;
  sellers: number;
  buyers: number;
  prospects: number;
}> {
  const result = await executeSql<{
    total: number;
    sellers: number;
    buyers: number;
    prospects: number;
  }>(
    `SELECT
       count(*)::int as total,
       count(*) FILTER (WHERE is_seller)::int as sellers,
       count(*) FILTER (WHERE is_buyer)::int as buyers,
       count(*) FILTER (WHERE is_prospect)::int as prospects
     FROM ${tableRef("companies")}`,
  );
  return result.rows?.[0] ?? { total: 0, sellers: 0, buyers: 0, prospects: 0 };
}

// ---- Writes ----

function inputToColumnsAndValues(input: CompanyInput): {
  columns: string[];
  values: string[];
} {
  return {
    columns: [
      "name",
      "name_en",
      "name_kana",
      "corporate_number",
      "edinet_code",
      "sec_code",
      "industry",
      "industry_detail",
      "listing_status",
      "address",
      "postal_code",
      "phone",
      "email",
      "website",
      "representative",
      "capital",
      "employee_count",
      "founded_date",
      "business_summary",
      "notes",
      "is_seller",
      "is_buyer",
      "is_prospect",
      "buyer_status",
      "strong_buyer",
      "target_deal",
      "last_approach_date",
      "last_approach_method",
      "nda_date",
      "buyer_assigned_to",
    ],
    values: [
      escapeSqlValue(input.name),
      escapeSqlValue(input.nameEn),
      escapeSqlValue(input.nameKana),
      escapeSqlValue(input.corporateNumber),
      escapeSqlValue(input.edinetCode),
      escapeSqlValue(input.secCode),
      escapeSqlValue(input.industry),
      escapeSqlValue(input.industryDetail),
      escapeSqlValue(input.listingStatus),
      escapeSqlValue(input.address),
      escapeSqlValue(input.postalCode),
      escapeSqlValue(input.phone),
      escapeSqlValue(input.email),
      escapeSqlValue(input.website),
      escapeSqlValue(input.representative),
      escapeSqlValue(input.capital),
      escapeSqlValue(input.employeeCount),
      escapeSqlValue(input.foundedDate),
      escapeSqlValue(input.businessSummary),
      escapeSqlValue(input.notes),
      escapeSqlValue(input.isSeller ?? false),
      escapeSqlValue(input.isBuyer ?? false),
      escapeSqlValue(input.isProspect ?? false),
      escapeSqlValue(input.buyerStatus),
      escapeSqlValue(input.strongBuyer ?? false),
      escapeSqlValue(input.targetDeal),
      escapeSqlValue(input.lastApproachDate),
      escapeSqlValue(input.lastApproachMethod),
      escapeSqlValue(input.ndaDate),
      escapeSqlValue(input.buyerAssignedTo),
    ],
  };
}

export async function create(input: CompanyInput): Promise<Company> {
  const id = crypto.randomUUID();
  const { columns, values } = inputToColumnsAndValues(input);
  const result = await executeSql(
    `INSERT INTO ${tableRef("companies")} (id, ${columns.join(", ")}) VALUES (${escapeSqlValue(id)}, ${values.join(", ")})`,
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
  patch: Partial<CompanyInput>,
): Promise<Company | null> {
  const assignments: string[] = [];

  const set = (col: string, value: unknown) => {
    if (value !== undefined)
      assignments.push(`${col} = ${escapeSqlValue(value)}`);
  };

  set("name", patch.name);
  set("name_en", patch.nameEn);
  set("name_kana", patch.nameKana);
  set("corporate_number", patch.corporateNumber);
  set("edinet_code", patch.edinetCode);
  set("sec_code", patch.secCode);
  set("industry", patch.industry);
  set("industry_detail", patch.industryDetail);
  set("listing_status", patch.listingStatus);
  set("address", patch.address);
  set("postal_code", patch.postalCode);
  set("phone", patch.phone);
  set("email", patch.email);
  set("website", patch.website);
  set("representative", patch.representative);
  set("capital", patch.capital);
  set("employee_count", patch.employeeCount);
  set("founded_date", patch.foundedDate);
  set("business_summary", patch.businessSummary);
  set("notes", patch.notes);
  if (patch.isSeller !== undefined)
    assignments.push(`is_seller = ${patch.isSeller ? "TRUE" : "FALSE"}`);
  if (patch.isBuyer !== undefined)
    assignments.push(`is_buyer = ${patch.isBuyer ? "TRUE" : "FALSE"}`);
  if (patch.isProspect !== undefined)
    assignments.push(`is_prospect = ${patch.isProspect ? "TRUE" : "FALSE"}`);
  set("buyer_status", patch.buyerStatus);
  if (patch.strongBuyer !== undefined)
    assignments.push(`strong_buyer = ${patch.strongBuyer ? "TRUE" : "FALSE"}`);
  set("target_deal", patch.targetDeal);
  set("last_approach_date", patch.lastApproachDate);
  set("last_approach_method", patch.lastApproachMethod);
  set("nda_date", patch.ndaDate);
  set("buyer_assigned_to", patch.buyerAssignedTo);

  if (assignments.length === 0) return findById(id);
  assignments.push("updated_at = now()");

  const result = await executeSql(
    `UPDATE ${tableRef("companies")} SET ${assignments.join(", ")} WHERE id = ${escapeSqlValue(id)}`,
  );
  if ((result.affected_rows ?? 0) < 1) return null;
  return findById(id);
}

export async function remove(id: string): Promise<boolean> {
  const result = await executeSql(
    `DELETE FROM ${tableRef("companies")} WHERE id = ${escapeSqlValue(id)}`,
  );
  return (result.affected_rows ?? 0) > 0;
}

// ---- Bulk insert (used by the seeder) ----

/**
 * Insert many companies in a single multi-row VALUES statement. Caller
 * should batch in chunks of ~100-500 to keep SQL size manageable.
 */
export async function bulkInsert(rows: CompanyInput[]): Promise<number> {
  if (rows.length === 0) return 0;

  const columns = [
    "id",
    "name",
    "name_kana",
    "corporate_number",
    "edinet_code",
    "sec_code",
    "industry_detail",
    "listing_status",
  ];

  const valuesList = rows.map((r) => {
    const id = crypto.randomUUID();
    return `(
      ${escapeSqlValue(id)},
      ${escapeSqlValue(r.name)},
      ${escapeSqlValue(r.nameKana)},
      ${escapeSqlValue(r.corporateNumber)},
      ${escapeSqlValue(r.edinetCode)},
      ${escapeSqlValue(r.secCode)},
      ${escapeSqlValue(r.industryDetail)},
      ${escapeSqlValue(r.listingStatus)}
    )`;
  });

  const result = await executeSql(
    `INSERT INTO ${tableRef("companies")} (${columns.join(", ")}) VALUES ${valuesList.join(", ")}`,
  );
  return result.affected_rows ?? 0;
}
