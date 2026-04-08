const BASE = "https://api.info.gbiz.go.jp/hojin/v2/hojin";

function apiKey(): string {
  return process.env.GBIZ_API_TOKEN || "";
}

// ---- Rate limit & retry ----

const MAX_RETRIES = 3;
const BASE_DELAY = 500; // ms

/** Per-process concurrency gate: max 3 gBizINFO requests at once */
let running = 0;
const queue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (running < 3) {
    running++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => queue.push(resolve));
}

function releaseSlot() {
  running--;
  const next = queue.shift();
  if (next) {
    running++;
    next();
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function apiFetch<T>(path: string): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("NO_GBIZ_TOKEN");

  await acquireSlot();
  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "X-hojinInfo-api-token": key },
        next: { revalidate: 3600 },
      });

      if (res.ok) return res.json() as Promise<T>;

      // Rate limited (429) or server error (5xx) → retry with backoff
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      const text = await res.text().catch(() => "");
      throw new Error(`gBizINFO API ${res.status}: ${text.slice(0, 100)}`);
    }
    throw new Error("gBizINFO API: max retries exceeded");
  } finally {
    releaseSlot();
  }
}

// ---- Types ----

export interface GBizCompany {
  corporate_number: string;
  name: string;
  kana?: string;
  name_en?: string | null;
  postal_code?: string;
  location?: string;
  status?: string;
  kind?: string;
  representative_name?: string | null;
  capital_stock?: number | null;
  employee_number?: number | null;
  company_size_male?: number | null;
  company_size_female?: number | null;
  business_summary?: string | null;
  company_url?: string | null;
  founding_year?: number | null;
  date_of_establishment?: string | null;
  industry?: string[];
  business_items?: string[];
  update_date?: string;
  number_of_activity?: string;
}

export interface GBizResponse {
  message: string;
  "hojin-infos": GBizCompany[];
}

export interface SubsidyItem {
  title?: string;
  subsidy_resource?: string;
  amount?: number;
  target?: string;
  date_of_approval?: string;
  government_departments?: string;
  note?: string;
}

export interface PatentItem {
  patent_type?: string;
  application_number?: string;
  title?: string;
  application_date?: string;
  open_date?: string;
  registration_date?: string;
  applicant_name?: string;
}

export interface GBizDetailResponse {
  message: string;
  "hojin-infos": Array<
    GBizCompany & {
      subsidy?: SubsidyItem[];
      patent?: PatentItem[];
      certification?: unknown[];
      finance?: unknown;
      workplace_info?: unknown;
    }
  >;
}

// ---- API functions ----

export interface SearchParams {
  name?: string;
  /** 設立年 下限 (YYYY) */
  founded_year_from?: number;
  /** 設立年 上限 (YYYY) */
  founded_year_to?: number;
  capital_stock_from?: number;
  capital_stock_to?: number;
  employee_number_from?: number;
  employee_number_to?: number;
  prefecture?: string;
  subsidy?: boolean;
  patent?: boolean;
  commendation?: boolean;
  finance?: boolean;
  /** 存続中法人のみ (true → 閉鎖除外) */
  exist_flg?: boolean;
  /** 事業項目の部分一致 */
  business_item?: string;
  page?: number;
  limit?: number;
}

export async function searchCompanies(
  params: SearchParams,
): Promise<GBizResponse> {
  const qs = new URLSearchParams();
  if (params.name) qs.set("name", params.name);
  if (params.founded_year_from)
    qs.set("founded_year", String(params.founded_year_from));
  if (params.founded_year_to)
    qs.set("founded_year_to", String(params.founded_year_to));
  if (params.capital_stock_from)
    qs.set("capital_stock_from", String(params.capital_stock_from));
  if (params.capital_stock_to)
    qs.set("capital_stock_to", String(params.capital_stock_to));
  if (params.employee_number_from)
    qs.set("employee_number_from", String(params.employee_number_from));
  if (params.employee_number_to)
    qs.set("employee_number_to", String(params.employee_number_to));
  if (params.prefecture) qs.set("prefecture", params.prefecture);
  if (params.subsidy) qs.set("subsidy", "true");
  if (params.patent) qs.set("patent", "true");
  if (params.commendation) qs.set("commendation", "true");
  if (params.finance) qs.set("finance", "true");
  if (params.exist_flg) qs.set("exist_flg", "true");
  if (params.business_item) qs.set("business_item", params.business_item);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 100));

  return apiFetch<GBizResponse>(`?${qs}`);
}

export async function getCompany(
  corporateNumber: string,
): Promise<GBizDetailResponse> {
  return apiFetch<GBizDetailResponse>(`/${corporateNumber}`);
}

export async function getSubsidy(
  corporateNumber: string,
): Promise<GBizDetailResponse> {
  return apiFetch<GBizDetailResponse>(`/${corporateNumber}/subsidy`);
}

export async function getPatent(
  corporateNumber: string,
): Promise<GBizDetailResponse> {
  return apiFetch<GBizDetailResponse>(`/${corporateNumber}/patent`);
}

export async function getCertification(
  corporateNumber: string,
): Promise<GBizDetailResponse> {
  return apiFetch<GBizDetailResponse>(`/${corporateNumber}/certification`);
}

// ---- Additional endpoints ----

export interface FinanceItem {
  fiscal_year_cover_page?: string;
  accounting_standards?: string;
  net_sales?: number | null;
  operating_revenue?: number | null;
  ordinary_income?: number | null;
  net_income?: number | null;
  total_assets?: number | null;
  net_assets?: number | null;
  capital_stock_summary?: number | null;
  number_of_employees?: number | null;
  major_shareholders?: unknown;
  date_of_general_meeting?: string | null;
}

export interface WorkplaceItem {
  base_infos?: {
    corporate_number?: string;
    name?: string;
    average_age?: number | null;
    average_continuous_service_years?: number | null;
    average_continuous_service_years_Female?: number | null;
    average_continuous_service_years_Male?: number | null;
    month_average_predetermined_overtime_hours?: number | null;
    annual_days_of_paid_leave_taken?: number | null;
    rate_of_paid_leave_taken?: number | null;
    rate_of_return_from_childcare_leave?: number | null;
    number_of_maternity_leave?: number | null;
    number_of_paternity_leave?: number | null;
  };
  compatibility_of_childcare_and_work?: Record<string, unknown>;
  women_activity_infos?: Record<string, unknown>;
}

export interface CommendationItem {
  title?: string;
  date_of_commendation?: string;
  government_departments?: string;
  category?: string;
  target?: string;
}

export interface GBizFinanceResponse {
  message: string;
  "hojin-infos": Array<{ finance?: FinanceItem[] }>;
}

export interface GBizWorkplaceResponse {
  message: string;
  "hojin-infos": Array<{ workplace_info?: WorkplaceItem[] }>;
}

export interface GBizCommendationResponse {
  message: string;
  "hojin-infos": Array<{ commendation?: CommendationItem[] }>;
}

export async function getFinance(
  corporateNumber: string,
): Promise<GBizFinanceResponse> {
  return apiFetch<GBizFinanceResponse>(`/${corporateNumber}/finance`);
}

export async function getWorkplace(
  corporateNumber: string,
): Promise<GBizWorkplaceResponse> {
  return apiFetch<GBizWorkplaceResponse>(`/${corporateNumber}/workplace`);
}

export async function getCommendation(
  corporateNumber: string,
): Promise<GBizCommendationResponse> {
  return apiFetch<GBizCommendationResponse>(`/${corporateNumber}/commendation`);
}

// ---- Helpers ----

export const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

export const CORP_KIND: Record<string, string> = {
  "101": "国の機関",
  "201": "地方公共団体",
  "301": "株式会社",
  "302": "有限会社",
  "303": "合名会社",
  "304": "合資会社",
  "305": "合同会社",
  "399": "その他法人",
  "401": "外国会社等",
  "499": "その他",
};

export function kindLabel(kind: string | undefined): string {
  return kind ? CORP_KIND[kind] || kind : "";
}

export function formatCapital(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}億円`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)}万円`;
  return `${n.toLocaleString()}円`;
}

export function formatEstablished(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return dateStr.substring(0, 10);
}

export function yearsOld(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const est = new Date(dateStr);
  const now = new Date();
  return Math.floor(
    (now.getTime() - est.getTime()) / (1000 * 60 * 60 * 24 * 365),
  );
}

/** major_shareholders をレンダリング可能な文字列に変換 */
export function formatMajorShareholders(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") return val;
  if (Array.isArray(val)) {
    return val
      .map((v) => {
        if (typeof v === "string") return v;
        if (typeof v === "object" && v !== null) {
          const name =
            (v as Record<string, unknown>).name_major_shareholders ??
            (v as Record<string, unknown>).name ??
            "";
          const ratio = (v as Record<string, unknown>).shareholding_ratio;
          return ratio ? `${name}（${ratio}%）` : String(name);
        }
        return String(v);
      })
      .filter(Boolean)
      .join("、");
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const name = obj.name_major_shareholders ?? obj.name ?? "";
    const ratio = obj.shareholding_ratio;
    return ratio ? `${name}（${ratio}%）` : String(name);
  }
  return String(val);
}
