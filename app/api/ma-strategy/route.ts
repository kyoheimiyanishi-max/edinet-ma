import { streamText } from "ai";
import { getModel } from "@/lib/ai-model";
import { aiRateLimitGate } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(req: Request) {
  const limited = await aiRateLimitGate(req, "ma-strategy");
  if (limited) return limited;

  const { company } = await req.json();

  const prompt = `以下の企業データを分析し、M&A戦略を推察してください。

## 企業情報
- 企業名: ${company.name}
- 業種: ${company.industry || "不明"}
- 上場区分: ${company.listingCategory || "不明"}
- 信用格付: ${company.creditRating || "不明"} (${company.creditScore || "-"}pt)
- 時価総額: ${company.marketCap ? `${(company.marketCap / 100000000).toFixed(0)}億円` : "不明"}

## 財務データ
- 売上高: ${company.revenue ? `${(company.revenue / 100000000).toFixed(0)}億円` : "不明"}
- 営業利益: ${company.operatingIncome ? `${(company.operatingIncome / 100000000).toFixed(0)}億円` : "不明"}
- 純利益: ${company.netIncome ? `${(company.netIncome / 100000000).toFixed(0)}億円` : "不明"}
- 総資産: ${company.totalAssets ? `${(company.totalAssets / 100000000).toFixed(0)}億円` : "不明"}
- 自己資本: ${company.equity ? `${(company.equity / 100000000).toFixed(0)}億円` : "不明"}
- 現金: ${company.cash ? `${(company.cash / 100000000).toFixed(0)}億円` : "不明"}
- 自己資本比率: ${company.equityRatio ? `${(company.equityRatio * 100).toFixed(1)}%` : "不明"}

## 株主構成
${company.shareholders?.length > 0 ? company.shareholders.map((s: { name: string; ratio: number; delta: number; purpose: string }) => `- ${s.name}: ${(s.ratio * 100).toFixed(1)}% (変動: ${s.delta > 0 ? "+" : ""}${(s.delta * 100).toFixed(2)}%) 目的: ${s.purpose || "不明"}`).join("\n") : "データなし"}

## Wikidata概要
${company.description || "なし"}

以下の観点で分析してください。**必ずMarkdown形式で**回答してください。

**出力の冒頭に、必ず以下の形式で一言サマリを記載してください。**

\`\`\`
### 要約
（この企業のM&Aポジションと戦略の方向性を1〜2文・最大120文字程度で簡潔に記述）
\`\`\`

その後、以下のセクションを続けてください。

### 1. M&A戦略の推察
この企業の事業領域・財務状況・株主構成から推察されるM&A戦略を分析してください。
- 買収側か被買収側か
- 強化しそうな事業領域
- 株主構成から読み取れる動向（アクティビスト、買い増し傾向など）

### 2. 次に買収しそうな企業の予測
具体的な企業名を挙げて、なぜその企業が買収候補になりうるかを説明してください。
各候補について以下を記載:
- **企業名**（上場/非上場）
- **推定規模**（売上・時価総額の目安）
- **買収の狙い**（技術獲得、市場拡大、垂直統合など）
- **実現可能性**（高/中/低）

### 3. 被買収リスクの評価
逆にこの企業が買収される可能性も評価してください。
- リスクレベル（高/中/低）
- 想定される買収者
- 防衛策の有無

### 4. M&A実行における注意点
- 財務的な余力
- 規制・法的リスク
- PMI（統合後）の課題`;

  const result = streamText({
    model: getModel("sonnet"),
    system:
      "あなたはM&A（合併・買収）戦略の専門アナリストです。企業データに基づいた客観的かつ実践的な分析を日本語で提供してください。推測には必ず根拠を示してください。",
    prompt,
  });

  return result.toTextStreamResponse();
}
