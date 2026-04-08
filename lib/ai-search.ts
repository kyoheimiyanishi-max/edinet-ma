import { unstable_cache } from "next/cache";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

/**
 * AIでクエリを拡張し、関連する検索キーワードを生成
 * 例: "AI" → ["AI", "人工知能", "機械学習", "ディープラーニング", "DX"]
 * 例: "フィンテック" → ["フィンテック", "FinTech", "金融テクノロジー", "決済", "送金"]
 */

async function expandQueryUncached(query: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [query];

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `あなたは日本の企業データベースの検索アシスタントです。
ユーザーの検索クエリ「${query}」に対して、関連する企業を見つけるための検索キーワードを5つ生成してください。

ルール:
- 元のクエリを1行目に含める
- 類義語、英語/日本語の対訳、関連業種名、略称を含める
- 1行に1キーワード、余計な説明なし
- 日本の企業名データベースで検索するためのキーワード

出力例（クエリが「AI」の場合）:
AI
人工知能
機械学習
ディープラーニング
テクノロジー`,
      maxOutputTokens: 100,
    });

    const terms = text
      .split("\n")
      .map((t) => t.replace(/^[-・\d.]+\s*/, "").trim())
      .filter((t) => t.length > 0 && t.length < 30);

    return terms.length > 0 ? terms : [query];
  } catch {
    return [query];
  }
}

const cachedExpandQuery = unstable_cache(
  async (q: string) => expandQueryUncached(q),
  ["ai-expand-query-v1"],
  { revalidate: 86400 * 30, tags: ["ai-expand-query"] },
);

export async function expandQuery(query: string): Promise<string[]> {
  const normalized = query.trim();
  if (!normalized) return [query];
  return cachedExpandQuery(normalized);
}
