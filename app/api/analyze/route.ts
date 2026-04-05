import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import {
  getCompany,
  getCompanyShareholders,
  formatYen,
} from "@/lib/edinetdb";
import { searchNews } from "@/lib/news";

export async function POST(req: Request) {
  const { edinetCode } = await req.json();

  if (!edinetCode) {
    return new Response("edinetCode required", { status: 400 });
  }

  // Fetch all data in parallel
  const [company, shareholders, maNews] = await Promise.all([
    getCompany(edinetCode).catch(() => null),
    getCompanyShareholders(edinetCode).catch(() => []),
    (async () => {
      try {
        const c = await getCompany(edinetCode);
        const shortName = c.name.replace(/株式会社|（株）/g, "").trim();
        return searchNews(`${shortName} M&A 買収 子会社化`);
      } catch {
        return [];
      }
    })(),
  ]);

  if (!company) {
    return new Response("Company not found", { status: 404 });
  }

  const f = company.latest_financials;
  const shortName = company.name.replace(/株式会社|（株）/g, "").trim();

  const companyContext = `
企業名: ${company.name}
EDINETコード: ${company.edinet_code}
証券コード: ${company.sec_code || "なし"}
業種: ${company.industry}
信用格付け: ${company.credit_rating} (${company.credit_score}pt)
${f ? `
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
- 平均年収: ${formatYen(f.avg_annual_salary)}
` : "財務データなし"}

【大量保有者 (上位10)】
${shareholders.slice(0, 10).map((s) => `- ${s.holder_name}: ${(s.total_holding_ratio * 100).toFixed(2)}% (${s.holder_type}) 目的: ${s.purpose || "不明"}`).join("\n") || "データなし"}

【M&A関連ニュース (直近)】
${maNews.slice(0, 15).map((n) => `- [${n.pubDate?.substring(0, 10) || "日付不明"}] ${n.title}`).join("\n") || "ニュースなし"}
`.trim();

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: `あなたはM&A戦略アナリストです。提供された企業データとニュースを分析し、以下の形式で回答してください。
推測や分析は根拠を明示し、「可能性がある」「推察される」など断定を避けた表現を使ってください。
金額は億円・百万円など読みやすい単位を使ってください。`,
    prompt: `以下の企業データを分析し、指定のJSON形式で回答してください。

${companyContext}

以下のJSON形式で出力してください（Markdownではなく純粋なJSONのみ）:

{
  "companyOverview": "会社の概要説明（業種、主な事業内容、市場での位置づけ、特徴を3-5文で）",
  "maAcquisitions": [
    {
      "date": "YYYY-MM or YYYY",
      "target": "買収先企業名",
      "amount": "金額（推定含む。不明なら「非公開」）",
      "purpose": "買収目的・背景の簡潔な説明"
    }
  ],
  "corporateStrategy": "会社の事業戦略の推察（財務データ・株主構成・ニュースから読み取れる方向性を3-5文で）",
  "maStrategy": "M&A戦略の推察（過去の買収パターン、投資の方向性、業界での狙いを3-5文で）",
  "nextTargets": [
    {
      "type": "買収しそうな企業の特徴・業種",
      "scale": "想定される規模感（売上・時価総額の目安）",
      "rationale": "なぜこの領域を狙うと推察されるか"
    }
  ]
}

ニュースから読み取れるM&A実績を maAcquisitions にできるだけ載せてください。
ニュースに${shortName}のM&A情報がない場合でも、業種・財務状況から合理的な推察を行ってください。
nextTargets は2-4件を目安に出してください。`,
  });

  return result.toTextStreamResponse();
}
