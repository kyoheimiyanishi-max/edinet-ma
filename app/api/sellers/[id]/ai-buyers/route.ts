import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { getModel } from "@/lib/ai-model";
import { z } from "zod";
import { findById as getSeller } from "@/lib/d6e/repos/sellers";

export const maxDuration = 120;

const BuyerSchema = z.object({
  buyers: z
    .array(
      z.object({
        companyName: z.string().describe("買い手候補企業名"),
        industry: z.string().describe("業種・事業領域"),
        rationale: z
          .string()
          .describe(
            "この売主にとってこの買い手が適している理由（シナジー・財務余力・戦略適合性など）",
          ),
        fitScore: z.number().min(1).max(10).describe("適合度スコア(1-10)"),
      }),
    )
    .min(3)
    .max(10),
});

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const seller = await getSeller(id);
  if (!seller) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const minutesText = seller.minutes
    .map(
      (m) =>
        `### ${m.title} (${m.date})\n参加者: ${m.participants.join(", ")}\n${m.content}`,
    )
    .join("\n\n");

  const documentsText = seller.documents
    .map((d) => `### ${d.title}\n${d.content}`)
    .join("\n\n");

  const existingBuyers = seller.buyers.map((b) => b.companyName).join(", ");

  const prompt = `以下はM&A売主企業の情報です。この売主にマッチする買い手候補企業を日本市場の実在企業名で3〜10社提案してください。

## 売主情報
- 企業名: ${seller.companyName}
- 業種: ${seller.industry || "不明"}
- 所在地: ${seller.prefecture || "不明"}
- 概要: ${seller.description || "なし"}

## 売主プロフィール（事業モデル・強み・財務ハイライト等）
${seller.profile || "未記入"}

## 売主の希望条件
${seller.desiredTerms || "未記入"}

## 過去の議事録（売主との打ち合わせ内容）
${minutesText || "なし"}

## アップロードされた資料
${documentsText || "なし"}

## 既に登録済みの買い手候補（重複させない）
${existingBuyers || "なし"}

以下の観点で買い手候補を選定してください:
1. 事業シナジー（事業領域の補完・顧客基盤の活用）
2. 財務余力（買収可能な規模感）
3. 戦略適合性（売主の希望条件との整合）
4. 地理的・業界的な近接性

各候補について、なぜマッチするかの具体的な根拠を明記してください。`;

  try {
    const result = await generateText({
      model: getModel("sonnet"),
      output: Output.object({ schema: BuyerSchema }),
      system:
        "あなたは日本のM&A仲介専門家です。売主情報を精査し、実在する日本企業を買い手候補として提案してください。架空の企業名は絶対に使わないこと。",
      prompt,
    });

    return NextResponse.json(result.output);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI生成失敗" },
      { status: 500 },
    );
  }
}
