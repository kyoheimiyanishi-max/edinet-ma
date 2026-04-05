const BASE = "https://edinetdb.jp/v1";

function apiKey(): string {
  return process.env.EDINET_API_KEY || "";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("NO_API_KEY");

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": key,
      ...(init?.headers || {}),
    },
    next: { revalidate: 1800 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`EDINET DB API error ${res.status}: ${text.slice(0, 100)}`);
  }
  return res.json();
}

// ---- Types ----

export interface Company {
  edinet_code: string;
  sec_code: string;
  name: string;
  name_ja: string;
  name_en: string | null;
  industry: string;
  credit_score: number;
  credit_rating: string;
  accounting_standard?: string;
}

export interface CompanyDetail extends Company {
  data_years: number;
  latest_financials: Financials | null;
  latest_earnings: Earnings | null;
  data_notes?: string[];
}

export interface Financials {
  fiscal_year: number;
  revenue: number | null;
  operating_income: number | null;
  net_income: number | null;
  total_assets: number | null;
  equity: number | null;
  cash: number | null;
  equity_ratio_official: number | null;
  eps: number | null;
  bps: number | null;
  roe?: number | null;
  roa?: number | null;
  doc_id: string;
  edinet_filing_url: string;
  avg_annual_salary?: number | null;
  avg_age?: number | null;
}

export interface Earnings {
  fiscal_year_end: string;
  revenue: number | null;
  operating_income: number | null;
  net_income: number | null;
  revenue_change: number | null;
  operating_income_change: number | null;
  net_income_change: number | null;
  quarter: number;
  pdf_url: string;
  disclosure_date: string;
  title: string;
}

export interface ShareholderReport {
  doc_id: string;
  doc_type_code: string;
  document_title: string;
  filer_edinet_code: string;
  filer_name: string;
  holder_name: string;
  holder_number: number;
  holder_type: string;
  holding_ratio: number;
  holding_ratio_previous: number;
  shares_held: number;
  shares_outstanding: number;
  total_holding_ratio: number;
  joint_holder_count: number;
  is_change_report: boolean;
  filing_trigger_date: string;
  submit_date_time: string;
  change_reason: string | null;
  purpose: string | null;
  issuer_edinet_code: string;
  issuer_name: string;
  issuer_sec_code: string;
}

// ---- API functions ----

export async function searchCompanies(query: string): Promise<Company[]> {
  if (!query) return [];
  const data = await apiFetch<{ data: Company[] }>(`/search?q=${encodeURIComponent(query)}`);
  return data.data || [];
}

export async function listCompanies(params?: {
  industry?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: Company[]; meta: { pagination: { total: number; total_pages: number; page: number; per_page: number } } }> {
  const qs = new URLSearchParams();
  if (params?.industry) qs.set("industry", params.industry);
  if (params?.limit) qs.set("per_page", String(params.limit));
  if (params?.page) qs.set("page", String(params.page));
  return apiFetch(`/companies?${qs}`);
}

export async function getCompany(edinetCode: string): Promise<CompanyDetail> {
  const data = await apiFetch<{ data: CompanyDetail }>(`/companies/${edinetCode}`);
  return data.data;
}

export async function getCompanyShareholders(
  edinetCode: string
): Promise<ShareholderReport[]> {
  const data = await apiFetch<{ data: ShareholderReport[] }>(
    `/companies/${edinetCode}/shareholders`
  );
  return data.data || [];
}

export async function searchShareholders(holderName: string): Promise<ShareholderReport[]> {
  const data = await apiFetch<{ data: ShareholderReport[] }>(
    `/shareholders/search?q=${encodeURIComponent(holderName)}`
  );
  return data.data || [];
}

// ---- Helpers ----

export function formatYen(n: number | null | undefined): string {
  if (n == null) return "-";
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(1)}兆円`;
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(1)}億円`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(0)}万円`;
  return `${n.toLocaleString()}円`;
}

export function formatPct(n: number | null | undefined, decimals = 1): string {
  if (n == null) return "-";
  return `${(n * 100).toFixed(decimals)}%`;
}

export function formatSharePct(n: number | null | undefined): string {
  if (n == null) return "-";
  return `${(n * 100).toFixed(2)}%`;
}

export function creditColor(rating: string): string {
  const map: Record<string, string> = {
    S: "bg-green-100 text-green-700",
    A: "bg-blue-100 text-blue-700",
    B: "bg-yellow-100 text-yellow-700",
    C: "bg-red-100 text-red-700",
  };
  return map[rating] || "bg-gray-100 text-gray-600";
}

export function changeColor(change: number | null | undefined): string {
  if (change == null) return "text-gray-400";
  return change >= 0 ? "text-green-600" : "text-red-600";
}

export function formatChange(n: number | null | undefined): string {
  if (n == null) return "-";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function getEdinetUrl(docId: string): string {
  return `https://disclosure2.edinet-fsa.go.jp/WZEK0040.aspx?${docId}`;
}
