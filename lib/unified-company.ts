import "server-only";

import {
  searchCompanies as searchEdinet,
  listCompanies as listEdinet,
  screenerStartups,
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
import { expandQuery } from "./ai-search";

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
  /** EDINET screener API 由来の売上 (百万円) */
  revenueMillion?: number | null;
  /** EDINET screener API 由来の最終会計年度 */
  fiscalYear?: number;

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
  /** 売上下限 (百万円) — EDINET screener API 経由 */
  revenueMillionGte?: number;
  /** 売上上限 (百万円) — EDINET screener API 経由 */
  revenueMillionLte?: number;
  /** 内部留保 (純資産) 下限 (百万円) — EDINET screener API 経由 */
  equityMillionGte?: number;
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

/** EDINET screener API レスポンスを UnifiedCompany に変換 */
function screenerToUnified(c: {
  edinetCode: string;
  filerName: string;
  secCode: string;
  industry: string;
  name_en?: string | null;
  fiscalYear: number;
  accountingStandard: string;
  revenue?: number;
  business_tags?: string[];
}): UnifiedCompany {
  const codelistEntry = getByEdinetCode(c.edinetCode);
  const corporateNumber = codelistEntry?.corporateNumber;
  return {
    id: corporateNumber || c.edinetCode,
    source: "edinet",
    isListed: Boolean(c.secCode),
    name: c.filerName,
    industry: c.industry,
    edinetCode: c.edinetCode,
    corporateNumber,
    secCode: c.secCode,
    businessTags: c.business_tags,
    revenueMillion: c.revenue ?? null,
    fiscalYear: c.fiscalYear,
  };
}

/** 全角/半角・スペース・記号を除去して比較用に正規化 */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s　・･,\.\-‐ー－（）()「」『』【】\[\]]/g, "")
    .replace(/[株式会社|（株）|有限会社|合同会社|合名会社|合資会社]/g, "")
    .normalize("NFKC");
}

/**
 * 「企業名検索」のスコア。0=不一致 / 1=完全一致 / 中間=部分一致。
 * gBizINFO の API は緩めの部分一致を返すので、関係ない会社が混じる
 * のを抑えるためにアプリ側で再度スコアリングする。
 */
function nameMatchScore(name: string, query: string): number {
  const n = normalizeForMatch(name);
  const q = normalizeForMatch(query);
  if (!q) return 1;
  if (n === q) return 1;
  if (n.startsWith(q)) return 0.9;
  if (n.includes(q)) return 0.8;
  // 逆方向 (略称検索: "メルカリ" → "株式会社メルカリ" など): query が name を含む
  if (q.includes(n) && n.length >= 2) return 0.7;
  return 0;
}

/**
 * 事業項目クエリ(群)が company に当たるか。
 * - 会社名 (name) / industry / businessSummary / businessTags を haystack に連結。
 * - terms の **いずれか** がヒットすれば true (OR マッチ)。
 * - haystack が空なら true を返す (false negative を避ける)。
 * - terms は空文字を除外し、空配列なら常に true。
 */
function businessMatches(
  c: UnifiedCompany,
  terms: readonly string[] | undefined,
): boolean {
  if (!terms || terms.length === 0) return true;
  const normalized = terms.map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) return true;
  const haystack = [
    c.name,
    c.industry,
    c.businessSummary,
    ...(c.businessTags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return true;
  return normalized.some((t) => haystack.includes(t));
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
  const {
    q,
    listed,
    industry,
    gbiz,
    page = 1,
    perSourceLimit = 30,
    revenueMillionGte,
    revenueMillionLte,
    equityMillionGte,
  } = params;

  const useScreener =
    revenueMillionGte != null ||
    revenueMillionLte != null ||
    equityMillionGte != null;

  const wantEdinet = listed !== "unlisted";
  // 売上/内部留保フィルタが指定されているときは gBizINFO を呼ばない
  // (screener API 経由の EDINET 結果のみで絞り込む方が精度が高い)
  const wantGbiz = !useScreener && (Boolean(q) || hasGbizFilter(gbiz));

  // ユーザーが事業項目だけで検索したとき (q 無し): EDINET listing から
  // 多めに取得して post-merge フィルタで絞り込めるよう、フェッチ数を
  // 拡張する。
  const broadFetchForBusiness = !q && Boolean(gbiz?.business_item);
  const edinetFetchLimit = broadFetchForBusiness
    ? perSourceLimit * 10
    : perSourceLimit;

  // 事業項目の AI クエリ展開: 「BPO」→ ["BPO","業務受託","アウトソーシング",...]
  // EDINET/gBizINFO の素の検索がマッチしない英略語や類義語を拾う。
  // expandQuery は unstable_cache で 30日キャッシュ済みなので hit 時はほぼ無料。
  const rawBusiness = gbiz?.business_item?.trim();
  const expandedBusiness: string[] = rawBusiness
    ? await expandQuery(rawBusiness)
    : [];

  // EDINET fetch
  // - 売上/内部留保フィルタが指定されているときは screener エンドポイント
  //   経由 (revenue_gte / revenue_lte / equity_gte をネイティブ対応)
  // - クエリがあるときは search エンドポイント
  // - なければ listCompanies で全件
  const edinetPromise: Promise<{
    unified: UnifiedCompany[];
    total: number;
  }> = wantEdinet
    ? (async () => {
        try {
          if (useScreener) {
            const result = await screenerStartups({
              ...(revenueMillionGte != null
                ? { revenueGte: revenueMillionGte }
                : {}),
              ...(revenueMillionLte != null
                ? { revenueLte: revenueMillionLte }
                : {}),
              ...(equityMillionGte != null
                ? { equityGte: equityMillionGte }
                : {}),
              ...(industry ? { industry } : {}),
              sortBy: "revenue",
              limit: perSourceLimit * 4, // 後段の name/business フィルタで削れるので多めに取る
            });
            const unified = (result.companies ?? []).map(screenerToUnified);
            return { unified, total: result.total ?? unified.length };
          }
          // q が無く business だけが指定されているときは、AI展開した
          // 類義語群を EDINET の name 検索クエリとして並列に走らせ、
          // edinet_code で dedupe する (ユニオン検索)。EDINET 業種コードは
          // 粒度が粗く、gBizINFO 側 API は name 必須なので、社名/タグに
          // キーワードを含まない会社は素の検索では拾えないため。
          if (q) {
            const rows = await searchEdinet(q);
            const limited = rows.slice(0, perSourceLimit);
            const codelistMap = getManyByEdinetCode(
              limited.map((r) => r.edinet_code),
            );
            const unified = limited.map((c) =>
              edinetToUnified(c, codelistMap.get(c.edinet_code) ?? null),
            );
            return { unified, total: rows.length };
          }
          if (broadFetchForBusiness && expandedBusiness.length > 0) {
            const results = await Promise.all(
              expandedBusiness.map((term) =>
                searchEdinet(term).catch(() => [] as EdinetCompany[]),
              ),
            );
            const seen = new Map<string, EdinetCompany>();
            for (const rows of results) {
              for (const r of rows) {
                if (!seen.has(r.edinet_code)) seen.set(r.edinet_code, r);
              }
            }
            const merged = [...seen.values()].slice(0, perSourceLimit);
            const codelistMap = getManyByEdinetCode(
              merged.map((r) => r.edinet_code),
            );
            const unified = merged.map((c) =>
              edinetToUnified(c, codelistMap.get(c.edinet_code) ?? null),
            );
            return { unified, total: seen.size };
          }
          const result = await listEdinet({
            industry,
            limit: edinetFetchLimit,
            page,
          });
          const codelistMap = getManyByEdinetCode(
            result.data.map((r) => r.edinet_code),
          );
          const unified = result.data.map((c) =>
            edinetToUnified(c, codelistMap.get(c.edinet_code) ?? null),
          );
          return {
            unified,
            total: result.meta?.pagination?.total ?? result.data.length,
          };
        } catch {
          return { unified: [], total: 0 };
        }
      })()
    : Promise.resolve({ unified: [], total: 0 });

  // gBizINFO fetch
  // - q があればそれを name にして 1 回
  // - q 無し & business 指定時は、AI 展開語群を name として並列 fetch し
  //   corporate_number で dedupe (非上場側も事業項目でヒットさせる)
  const gbizPromise: Promise<{ rows: GBizCompany[]; total: number }> = wantGbiz
    ? (async () => {
        try {
          const names: string[] = q
            ? [q]
            : broadFetchForBusiness
              ? expandedBusiness
              : [];
          if (names.length === 0) {
            // q 無し / business 無し: その他フィルタ (都道府県 等) 単体では
            // gBizINFO API は name 必須で 400 になるため呼ばない。
            return { rows: [], total: 0 };
          }
          const results = await Promise.all(
            names.map((name) =>
              searchGBiz({
                ...(gbiz ?? {}),
                name,
                page,
                limit: perSourceLimit,
              })
                .then((r) => r["hojin-infos"] ?? [])
                .catch(() => [] as GBizCompany[]),
            ),
          );
          const seen = new Map<string, GBizCompany>();
          for (const batch of results) {
            for (const row of batch) {
              if (!seen.has(row.corporate_number)) {
                seen.set(row.corporate_number, row);
              }
            }
          }
          const rows = [...seen.values()];
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

  const edinetUnified = edinetSide.unified;

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

  // 事業項目フィルター (gBizINFO API は緩めの部分一致を返すので、
  // EDINET 結果も含めてアプリ側で再フィルタ)。
  // AI 展開語群 (expandedBusiness) のいずれかにヒットすれば採用。
  if (rawBusiness) {
    const terms =
      expandedBusiness.length > 0 ? expandedBusiness : [rawBusiness];
    merged = merged.filter((c) => businessMatches(c, terms));
  }

  // 企業名検索の精度向上: クエリがあるとき、name にスコア付けして
  // しきい値以下を捨てる + スコア降順でソート。これで「ソフト」検索
  // で「流山ソフト開発」が混ざる問題を緩和する。
  let nameScores: Map<string, number> | null = null;
  if (q && q.trim()) {
    nameScores = new Map();
    const filtered: UnifiedCompany[] = [];
    for (const c of merged) {
      const score = nameMatchScore(c.name, q);
      if (score >= 0.7) {
        nameScores.set(c.id, score);
        filtered.push(c);
      }
    }
    merged = filtered;
  }

  // 並び順:
  //  クエリ検索時 → name match score 降順 → credit_score 降順 → 名前
  //  それ以外     → 上場 → 非上場、内部は credit_score 降順 → 名前
  merged.sort((a, b) => {
    if (nameScores) {
      const sa = nameScores.get(a.id) ?? 0;
      const sb = nameScores.get(b.id) ?? 0;
      if (sa !== sb) return sb - sa;
    } else {
      if (a.isListed !== b.isListed) return a.isListed ? -1 : 1;
    }
    const csa = a.creditScore ?? -1;
    const csb = b.creditScore ?? -1;
    if (csa !== csb) return csb - csa;
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
