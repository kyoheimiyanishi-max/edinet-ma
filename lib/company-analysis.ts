import { unstable_cache } from "next/cache";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

import { getCompany, getCompanyShareholders, formatYen } from "@/lib/edinetdb";
import { searchNews } from "@/lib/news";
import { fetchMarketSegment } from "@/lib/market";

// ---- Schema ----

export const AnalysisSchema = z.object({
  marketSegment: z
    .string()
    .describe(
      "正確な市場区分: 東証プライム/東証スタンダード/東証グロース/その他",
    ),
  companyOverview: z
    .string()
    .describe(
      "会社の概要説明。創業年、本社所在地、主な事業内容、業界での位置づけ、従業員規模などを含め5-8文で詳しく",
    ),
  businessModel: z
    .string()
    .describe(
      "事業モデル。収益構造・主力事業・セグメント・顧客層・競合優位性を3-5文で具体的に",
    ),
  stockCharacteristics: z
    .string()
    .describe(
      "銘柄の投資特性。配当性向・成長性・ディフェンシブ/シクリカル・バリュー/グロース等を3-5文で",
    ),
  officers: z
    .array(
      z.object({
        position: z.string().describe("役職（例: 代表取締役社長）"),
        name: z.string().describe("氏名"),
        career: z
          .string()
          .describe("主な経歴（出身大学、前職、入社年、就任年などを簡潔に）"),
      }),
    )
    .describe("代表取締役、取締役、監査役など主要な役員5-10名"),
  maAcquisitions: z
    .array(
      z.object({
        date: z.string().describe("YYYY-MM または YYYY"),
        target: z.string().describe("買収先企業名"),
        amount: z.string().describe("金額（推定含む。不明なら「非公開」）"),
        purpose: z.string().describe("買収目的・背景の簡潔な説明"),
      }),
    )
    .describe("過去のM&A実績。知られている範囲でできるだけ多く"),
  corporateStrategy: z
    .string()
    .describe(
      "事業戦略の推察（財務データ・株主構成・ニュースから読み取れる方向性を3-5文）",
    ),
  maStrategy: z
    .string()
    .describe(
      "M&A戦略の推察（過去の買収パターン、投資の方向性、業界での狙いを3-5文）",
    ),
  nextTargets: z
    .array(
      z.object({
        type: z.string().describe("買収しそうな企業の特徴・業種"),
        scale: z.string().describe("想定される規模感（売上・時価総額の目安）"),
        rationale: z.string().describe("なぜこの領域を狙うと推察されるか"),
      }),
    )
    .describe("次に買収しそうな企業像を2-4件"),
});

export type CompanyAnalysisData = z.infer<typeof AnalysisSchema>;

export interface AnalysisResult {
  ok: true;
  data: CompanyAnalysisData;
}

export interface AnalysisError {
  ok: false;
  error: string;
}

// ---- Internal: build prompt context + call AI ----

async function buildContextAndAnalyze(
  edinetCode: string,
): Promise<AnalysisResult | AnalysisError> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY が設定されていません。.env.local に追加してください。",
    };
  }

  let company;
  try {
    company = await getCompany(edinetCode);
  } catch {
    return { ok: false, error: "Company not found" };
  }

  const [shareholders, maNews, marketSegment] = await Promise.all([
    getCompanyShareholders(edinetCode).catch(() => []),
    (async () => {
      try {
        const shortName = company.name.replace(/株式会社|(株)/g, "").trim();
        return searchNews(`${shortName} M&A 買収 子会社化`);
      } catch {
        return [];
      }
    })(),
    fetchMarketSegment(company.sec_code),
  ]);

  const f = company.latest_financials;
  const shortName = company.name.replace(/株式会社|(株)/g, "").trim();

  const companyContext = `
企業名: ${company.name}
英語名: ${company.name_en || "不明"}
EDINETコード: ${company.edinet_code}
証券コード: ${company.sec_code || "なし"}
業種: ${company.industry}
市場区分: ${marketSegment || "不明"}
会計基準: ${company.accounting_standard || "不明"}
信用格付け: ${company.credit_rating} (${company.credit_score}pt)
${
  f
    ? `
【財務データ (${f.fiscal_year}年度)】
- 売上高: ${formatYen(f.revenue)}
- 営業利益: ${formatYen(f.operating_income)}
- 純利益: ${formatYen(f.net_income)}
- 総資産: ${formatYen(f.total_assets)}
- 自己資本: ${formatYen(f.equity)}
- 現金: ${formatYen(f.cash)}
- 自己資本比率: ${f.equity_ratio_official != null ? (f.equity_ratio_official * 100).toFixed(1) + "%" : "-"}
- ROE: ${f.roe != null ? (f.roe * 100).toFixed(1) + "%" : "-"}
- ROA: ${f.roa != null ? (f.roa * 100).toFixed(1) + "%" : "-"}
- EPS: ${f.eps != null ? f.eps.toFixed(1) + "円" : "-"}
- BPS: ${f.bps != null ? f.bps.toFixed(1) + "円" : "-"}
- 平均年収: ${formatYen(f.avg_annual_salary)}
- 平均年齢: ${f.avg_age != null ? f.avg_age + "歳" : "-"}
`
    : "財務データなし"
}

【大量保有者 (上位10)】
${
  shareholders
    .slice(0, 10)
    .map(
      (s) =>
        `- ${s.holder_name}: ${(s.total_holding_ratio * 100).toFixed(2)}% (${s.holder_type}) 目的: ${s.purpose || "不明"}`,
    )
    .join("\n") || "データなし"
}

【M&A関連ニュース (直近)】
${
  maNews
    .slice(0, 15)
    .map((n) => `- [${n.pubDate?.substring(0, 10) || "日付不明"}] ${n.title}`)
    .join("\n") || "ニュースなし"
}
`.trim();

  try {
    const result = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: AnalysisSchema,
      system: `あなたはM&A戦略アナリスト兼企業調査の専門家です。日本の上場企業に精通しています。
提供された企業データとあなたの知識を組み合わせて分析してください。

重要なルール：
- 推測や分析は根拠を明示し、「可能性がある」「推察される」など断定を避けた表現を使う
- 金額は億円・百万円など読みやすい単位を使う
- 役員情報は有価証券報告書やIR情報に基づくあなたの知識から回答する
- 市場区分（プライム/スタンダード/グロース）は正確に回答する
- 事業モデルの説明は具体的かつ簡潔に`,
      prompt: `以下の企業データを分析してください。

${companyContext}

officers は代表取締役、取締役、監査役など主要な役員を5-10名程度、あなたの知識ベースにある${shortName}の役員情報から記載してください。
maAcquisitions はニュースやあなたの知識から分かるM&A実績をできるだけ載せてください。
nextTargets は2-4件を目安に出してください。
marketSegment は「${marketSegment || "不明"}」の情報も参考にしつつ、正確な値を回答してください。`,
    });

    return { ok: true, data: result.object };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "AI分析中にエラーが発生しました",
    };
  }
}

// ---- Public cached entry point ----

const cachedAnalyze = unstable_cache(
  async (edinetCode: string) => buildContextAndAnalyze(edinetCode),
  ["company-analysis-v1"],
  { revalidate: 86400 * 7, tags: ["company-analysis"] },
);

export async function getCompanyAnalysis(
  edinetCode: string,
): Promise<AnalysisResult | AnalysisError> {
  return cachedAnalyze(edinetCode);
}
