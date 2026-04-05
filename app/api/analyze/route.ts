import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { getCompany, getCompanyShareholders, formatYen } from "@/lib/edinetdb";
import { searchNews } from "@/lib/news";
import { fetchMarketSegment } from "@/lib/market";

export async function POST(req: Request) {
  // Check API key first
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      "ANTHROPIC_API_KEY が設定されていません。.env.local に追加してください。",
      { status: 500 },
    );
  }

  const { edinetCode } = await req.json();

  if (!edinetCode) {
    return new Response("edinetCode required", { status: 400 });
  }

  // Fetch all data in parallel
  let company;
  try {
    company = await getCompany(edinetCode);
  } catch {
    return new Response("Company not found", { status: 404 });
  }

  const [shareholders, maNews, marketSegment] = await Promise.all([
    getCompanyShareholders(edinetCode).catch(() => []),
    (async () => {
      try {
        const shortName = company.name.replace(/株式会社|（株）/g, "").trim();
        return searchNews(`${shortName} M&A 買収 子会社化`);
      } catch {
        return [];
      }
    })(),
    fetchMarketSegment(company.sec_code),
  ]);

  const f = company.latest_financials;
  const shortName = company.name.replace(/株式会社|（株）/g, "").trim();

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
    .map(
      (n) =>
        `- [${n.pubDate?.substring(0, 10) || "日付不明"}] ${n.title}`,
    )
    .join("\n") || "ニュースなし"
}
`.trim();

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: `あなたはM&A戦略アナリスト兼企業調査の専門家です。日本の上場企業に精通しています。
提供された企業データとあなたの知識を組み合わせて分析してください。

重要なルール：
- 推測や分析は根拠を明示し、「可能性がある」「推察される」など断定を避けた表現を使う
- 金額は億円・百万円など読みやすい単位を使う
- 役員情報は有価証券報告書やIR情報に基づくあなたの知識から回答する
- 市場区分（プライム/スタンダード/グロース）は正確に回答する
- 事業モデルの説明は具体的かつ簡潔に`,
    prompt: `以下の企業データを分析し、指定のJSON形式で回答してください。

${companyContext}

以下のJSON形式で出力してください（Markdownコードフェンスなし、純粋なJSONのみ）:

{
  "marketSegment": "東証プライム/東証スタンダード/東証グロース/その他（正確な市場区分）",
  "companyOverview": "会社の概要説明。創業年、本社所在地、主な事業内容、業界での位置づけ、従業員規模などを含め5-8文で詳しく。",
  "businessModel": "事業モデルの説明。収益構造、主力事業、セグメント構成、顧客層、競合優位性を3-5文で具体的に。",
  "stockCharacteristics": "この銘柄の投資特性。配当性向、成長性、ディフェンシブ/シクリカル、バリュー/グロース等の分類、注目ポイントを3-5文で。",
  "officers": [
    {
      "position": "代表取締役社長",
      "name": "氏名",
      "career": "主な経歴（出身大学、前職、入社年、就任年などを簡潔に）"
    }
  ],
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

officers は代表取締役、取締役、監査役など主要な役員を5-10名程度。あなたの知識ベースにある${shortName}の役員情報を回答してください。
maAcquisitions はニュースやあなたの知識から分かるM&A実績をできるだけ載せてください。
nextTargets は2-4件を目安に出してください。
marketSegment は「${marketSegment || "不明"}」の情報も参考にしつつ、正確な値を回答してください。`,
  });

  return result.toTextStreamResponse();
}
