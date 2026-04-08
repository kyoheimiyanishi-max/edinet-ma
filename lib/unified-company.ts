import "server-only";

import {
  searchCompanies as searchEdinet,
  listCompanies as listEdinet,
  type Company as EdinetCompany,
} from "./edinetdb";
import {
  searchCompanies as searchGBiz,
  type GBizCompany,
  type SearchParams as GBizSearchParams,
} from "./gbiz";
import {
  getByEdinetCode,
  getByCorporateNumber,
  getManyByEdinetCode,
  type EdinetCodelistEntry,
} from "./edinet-codelist";

/**
 * EDINET と gBizINFO を一つの検索結果にマージするユニファイドカンパニー層。
 *
 * 設計上の前提:
 * - EDINET DB API は corporate_number を返さないため、edinet-codelist.ts の
 *   ローカルマッピング (金融庁CSV由来) を使って 法人番号 を補完する。
 * - 「上場」判定 は sec_code が存在するか で行う (案A)。
 * - 重複排除 は corporate_number 一致で行う (案2)。両DBに存在する企業は
 *   1件にマージされ、`source="both"` となる。
 */

export type UnifiedSource = "edinet" | "gbiz" | "both";
export type ListedFilter = "all" | "listed" | "unlisted";

export interface UnifiedCompany {
  /** ルーティング用の安定 ID。法人番号 > EDINETコード > gBizコーポレート番号 の順で決定。 */
  id: string;
  /** どのソースに由来するか。両DBで突き合わせ済みなら "both"。 */
  source: UnifiedSource;
  /** sec_code が存在するか で判定 (案A)。 */
  isListed: boolean;

  name: string;
  industry?: string;

  edinetCode?: string;
  corporateNumber?: string;
  secCode?: string;

  // EDINET 由来
  creditRating?: string;
  creditScore?: number;
  businessTags?: string[];

  // gBizINFO 由来
  capitalStock?: number | null;
  employeeNumber?: number | null;
  foundingYear?: number | null;
  dateOfEstablishment?: string | null;
  prefecture?: string;
  location?: string;
  companyUrl?: string | null;
  representativeName?: string | null;
  businessSummary?: string | null;
  kind?: string;
  status?: string;
  updateDate?: string;
}

export interface UnifiedSearchParams {
  q?: string;
  listed: ListedFilter;
  /** EDINET の業種コード (情報・通信業 等)。EDINETヒットのフィルタにも使われる。 */
  industry?: string;
  /** gBizINFO 側の追加フィルター。listed!=='listed' のときのみ意味を持つ。 */
  gbiz?: Omit<GBizSearchParams, "name">;
  /** EDINET側のページネーション。 */
  page?: number;
  /** 1ソースあたりの上限件数 (デフォルト30)。 */
  perSourceLimit?: number;
}

export interface UnifiedSearchResult {
  companies: UnifiedCompany[];
  meta: {
    edinetTotal: number;
    gbizTotal: number;
    mergedTotal: number;
    listedCount: number;
    unlistedCount: number;
  };
}

// ---- helpers ----

function edinetToUnified(
  c: EdinetCompany,
  codelist: EdinetCodelistEntry | null,
): UnifiedCompany {
  const corporateNumber = codelist?.corporateNumber;
  const isListed = Boolean(c.sec_code) || Boolean(codelist?.secCode);
  return {
    id: corporateNumber || c.edinet_code,
    source: "edinet",
    isListed,
    name: c.name,
    industry: c.industry,
    edinetCode: c.edinet_code,
    corporateNumber,
    secCode: c.sec_code || codelist?.secCode,
    creditRating: c.credit_rating,
    creditScore: c.credit_score,
    businessTags: (c as EdinetCompany & { business_tags?: string[] })
      .business_tags,
  };
}

function gbizToUnified(c: GBizCompany): UnifiedCompany {
  // codelist で法人番号引き当て: 該当すれば EDINET 提出会社 = 上場/非上場 はそちらに従う
  const codelistEntry = c.corporate_number
    ? getByCorporateNumber(c.corporate_number)
    : null;
  const secCode = codelistEntry?.secCode;
  const isListed = Boolean(secCode);

  return {
    id: c.corporate_number,
    source: "gbiz",
    isListed,
    name: c.name,
    industry: c.industry?.[0],
    edinetCode: codelistEntry?.edinetCode,
    corporateNumber: c.corporate_number,
    secCode,
    capitalStock: c.capital_stock ?? null,
    employeeNumber: c.employee_number ?? null,
    foundingYear: c.founding_year ?? null,
    dateOfEstablishment: c.date_of_establishment ?? null,
    location: c.location,
    companyUrl: c.company_url,
    representativeName: c.representative_name,
    businessSummary: c.business_summary,
    kind: c.kind,
    status: c.status,
    updateDate: c.update_date,
  };
}

/** 同一 corporate_number で EDINET と gBizINFO の行をマージする。 */
function mergeRows(
  edinetSide: UnifiedCompany,
  gbizSide: UnifiedCompany,
): UnifiedCompany {
  // EDINET側の正式名・業種・上場属性を優先し、gBizINFO側の本社情報・財務粒度を補う。
  return {
    ...gbizSide,
    ...edinetSide,
    source: "both",
    // 両方にあるフィールドはマージ
    name: edinetSide.name || gbizSide.name,
    industry: edinetSide.industry || gbizSide.industry,
    capitalStock: gbizSide.capitalStock ?? edinetSide.capitalStock,
    employeeNumber: gbizSide.employeeNumber ?? edinetSide.employeeNumber,
    foundingYear: gbizSide.foundingYear ?? edinetSide.foundingYear,
    dateOfEstablishment:
      gbizSide.dateOfEstablishment ?? edinetSide.dateOfEstablishment,
    location: gbizSide.location ?? edinetSide.location,
    companyUrl: gbizSide.companyUrl ?? edinetSide.companyUrl,
    representativeName:
      gbizSide.representativeName ?? edinetSide.representativeName,
    businessSummary: gbizSide.businessSummary ?? edinetSide.businessSummary,
    kind: gbizSide.kind ?? edinetSide.kind,
    status: gbizSide.status ?? edinetSide.status,
    updateDate: gbizSide.updateDate ?? edinetSide.updateDate,
  };
}

// ---- main entry point ----

/**
 * 統合検索: EDINET と gBizINFO を並列で叩き、法人番号でマージしてから
 * 上場/非上場フィルターを適用する。
 *
 * パフォーマンス考慮:
 * - listed === "listed" のときは gBizINFO を呼ばない (EDINETヒットだけが上場)
 * - listed === "unlisted" + gBiz側にフィルターが無い + クエリも無い場合は EDINET を呼ばない
 * - それ以外は両ソースを Promise.all で並列実行
 */
export async function searchUnified(
  params: UnifiedSearchParams,
): Promise<UnifiedSearchResult> {
  const { q, listed, industry, gbiz, page = 1, perSourceLimit = 30 } = params;

  const wantEdinet = listed !== "unlisted";
  const wantGbiz = listed !== "listed" && (Boolean(q) || hasGbizFilter(gbiz));

  // EDINET fetch
  const edinetPromise: Promise<{
    rows: EdinetCompany[];
    total: number;
  }> = wantEdinet
    ? (async () => {
        try {
          if (q) {
            const rows = await searchEdinet(q);
            return { rows: rows.slice(0, perSourceLimit), total: rows.length };
          }
          const result = await listEdinet({
            industry,
            limit: perSourceLimit,
            page,
          });
          return {
            rows: result.data,
            total: result.meta?.pagination?.total ?? result.data.length,
          };
        } catch {
          return { rows: [], total: 0 };
        }
      })()
    : Promise.resolve({ rows: [], total: 0 });

  // gBizINFO fetch
  const gbizPromise: Promise<{ rows: GBizCompany[]; total: number }> = wantGbiz
    ? (async () => {
        try {
          const res = await searchGBiz({
            ...(gbiz ?? {}),
            ...(q ? { name: q } : {}),
            page,
            limit: perSourceLimit,
          });
          const rows = res["hojin-infos"] ?? [];
          return { rows, total: rows.length };
        } catch {
          return { rows: [], total: 0 };
        }
      })()
    : Promise.resolve({ rows: [], total: 0 });

  const [edinetSide, gbizSide] = await Promise.all([
    edinetPromise,
    gbizPromise,
  ]);

  // EDINET 結果をユニファイド化 (codelist で法人番号付与)
  const codelistMap = getManyByEdinetCode(
    edinetSide.rows.map((r) => r.edinet_code),
  );
  const edinetUnified = edinetSide.rows.map((c) =>
    edinetToUnified(c, codelistMap.get(c.edinet_code) ?? null),
  );

  // gBizINFO 結果をユニファイド化 (codelist で sec_code 付与)
  const gbizUnified = gbizSide.rows.map(gbizToUnified);

  // 法人番号でマージ
  const byCorpNum = new Map<string, UnifiedCompany>();
  const standalone: UnifiedCompany[] = [];

  for (const row of edinetUnified) {
    if (row.corporateNumber) {
      byCorpNum.set(row.corporateNumber, row);
    } else {
      standalone.push(row); // 海外企業など 法人番号なしの EDINET 提出者
    }
  }
  for (const row of gbizUnified) {
    // gBizINFO の検索結果は corporate_number が必須だが、型上は optional 扱い
    if (!row.corporateNumber) continue;
    const existing = byCorpNum.get(row.corporateNumber);
    if (existing) {
      byCorpNum.set(row.corporateNumber, mergeRows(existing, row));
    } else {
      byCorpNum.set(row.corporateNumber, row);
    }
  }

  let merged: UnifiedCompany[] = [...byCorpNum.values(), ...standalone];

  // 上場フィルター
  if (listed === "listed") {
    merged = merged.filter((c) => c.isListed);
  } else if (listed === "unlisted") {
    merged = merged.filter((c) => !c.isListed);
  }

  // EDINET 業種フィルター (gBiz由来は EDINET 業種コードを持たないので素通し)
  if (industry) {
    merged = merged.filter((c) => !c.industry || c.industry === industry);
  }

  // 並び順: 上場 → 非上場、内部は credit_score 降順 → 名前
  merged.sort((a, b) => {
    if (a.isListed !== b.isListed) return a.isListed ? -1 : 1;
    const sa = a.creditScore ?? -1;
    const sb = b.creditScore ?? -1;
    if (sa !== sb) return sb - sa;
    return a.name.localeCompare(b.name, "ja");
  });

  const listedCount = merged.filter((c) => c.isListed).length;

  return {
    companies: merged,
    meta: {
      edinetTotal: edinetSide.total,
      gbizTotal: gbizSide.total,
      mergedTotal: merged.length,
      listedCount,
      unlistedCount: merged.length - listedCount,
    },
  };
}

function hasGbizFilter(gbiz: UnifiedSearchParams["gbiz"]): boolean {
  if (!gbiz) return false;
  return Boolean(
    gbiz.founded_year_from ||
    gbiz.founded_year_to ||
    gbiz.capital_stock_from ||
    gbiz.capital_stock_to ||
    gbiz.employee_number_from ||
    gbiz.employee_number_to ||
    gbiz.prefecture ||
    gbiz.subsidy ||
    gbiz.patent ||
    gbiz.commendation ||
    gbiz.finance ||
    gbiz.exist_flg ||
    gbiz.business_item,
  );
}

// ---- 詳細ページ用: 単一企業のマージ取得 ----

/**
 * URL の id (EDINETコード or 法人番号) からユニファイド企業を解決する。
 * EDINETコード (E + 5桁) なら edinet-codelist で法人番号を引いて両方を統合し、
 * 13桁数字なら gBizINFO 側を主軸に EDINET 側を補完する。
 */
export type CompanyId =
  | { kind: "edinet"; edinetCode: string; corporateNumber: string | null }
  | { kind: "corporate"; corporateNumber: string; edinetCode: string | null };

export function parseCompanyId(raw: string): CompanyId | null {
  if (/^E\d{5}$/i.test(raw)) {
    const edinetCode = raw.toUpperCase();
    const entry = getByEdinetCode(edinetCode);
    return {
      kind: "edinet",
      edinetCode,
      corporateNumber: entry?.corporateNumber ?? null,
    };
  }
  if (/^\d{13}$/.test(raw)) {
    const entry = getByCorporateNumber(raw);
    return {
      kind: "corporate",
      corporateNumber: raw,
      edinetCode: entry?.edinetCode ?? null,
    };
  }
  return null;
}
