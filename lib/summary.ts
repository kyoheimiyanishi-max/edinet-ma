import { unstable_cache } from "next/cache";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { LineItem } from "@/components/ExpandableLinkList";

const MAX_ITEMS = 12;
const MAX_LEN = 80;

/**
 * Cached wrapper: accepts plain string args so unstable_cache can key on them.
 */
const cachedSummary = unstable_cache(
  async (titlesJoined: string, sectionLabel: string): Promise<string> => {
    if (!titlesJoined.trim()) return "";
    try {
      const result = await generateText({
        model: anthropic("claude-sonnet-4-5"),
        system:
          "あなたは日本語のビジネス情報要約の専門家です。与えられた情報リストを1文（最大60文字）で簡潔にまとめてください。余計な前置き・引用符・「まとめ:」等のラベル・句点は付けず、ビジネスパーソンが一目で把握できる平文の1行のみを返してください。",
        prompt: `セクション: ${sectionLabel}

情報一覧:
${titlesJoined}

上記の情報を1行（60文字以内）で要約してください。`,
      });
      const text = result.text.trim().split("\n")[0].trim();
      return text.slice(0, MAX_LEN);
    } catch {
      return "";
    }
  },
  ["company-section-summary-v1"],
  { revalidate: 86400 * 7 },
);

export async function summarizeItems(
  items: LineItem[],
  sectionLabel: string,
): Promise<string> {
  if (items.length === 0) return "";
  const titles = items
    .slice(0, MAX_ITEMS)
    .map((item, idx) => {
      const desc = item.description
        ? ` — ${item.description.slice(0, 80)}`
        : "";
      return `${idx + 1}. ${item.title}${desc}`;
    })
    .join("\n");
  return cachedSummary(titles, sectionLabel);
}
