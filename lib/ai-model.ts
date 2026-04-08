// 統一的な AI モデル選択ヘルパー
//
// - 優先: Vercel AI Gateway (AI_GATEWAY_API_KEY か Vercel OIDC トークン)
//   → OIDC認証 / フェイルオーバー / コスト可視化 / Gateway 上の最新モデル
// - フォールバック: @ai-sdk/anthropic 直接接続 (ANTHROPIC_API_KEY)
//   → Gateway が未設定のローカル開発環境でも動作継続
//
// 各呼び出し元は `getModel("sonnet" | "haiku")` とだけ書けばよい。

import { gateway } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

export type ModelSlug = "sonnet" | "haiku";

// Gateway 側: ドット区切り表記 (anthropic/claude-sonnet-4.6)
const GATEWAY_IDS: Record<ModelSlug, string> = {
  sonnet: "anthropic/claude-sonnet-4.6",
  haiku: "anthropic/claude-haiku-4.5",
};

// 直接 Anthropic 側: ハイフン区切り表記 (Anthropic API の正規表記)
// 既存コードで動作していた ID を踏襲し、無駄な model 変更を避ける。
const DIRECT_IDS: Record<ModelSlug, string> = {
  sonnet: "claude-sonnet-4-5",
  haiku: "claude-haiku-4-5-20251001",
};

// NOTE: not a React hook — prefix intentionally avoids `use*` to keep
// eslint-plugin-react-hooks happy when this module is imported from
// Server Components.
function isGatewayEnabled(): boolean {
  return !!(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export function getModel(slug: ModelSlug): LanguageModel {
  if (isGatewayEnabled()) {
    return gateway(GATEWAY_IDS[slug]);
  }
  return anthropic(DIRECT_IDS[slug]);
}

/**
 * AI認証情報が1つでも設定されているかをチェック。
 * UI側のエラー表示用。
 */
export function hasAiCredentials(): boolean {
  return !!(
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN ||
    process.env.ANTHROPIC_API_KEY
  );
}
