import { streamText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

import {
  searchCompanies as searchEdinetCompanies,
  getCompany as getEdinetCompany,
  getCompanyShareholders,
  searchShareholders,
} from "@/lib/edinetdb";
import { searchCompanies as searchGBizCompanies } from "@/lib/gbiz";
import { searchNews } from "@/lib/news";
import { searchLaws } from "@/lib/legal";
import { searchPapers } from "@/lib/research";
import { searchVideos } from "@/lib/youtube";
import { searchSeminars } from "@/lib/seminars";
import { searchPeople } from "@/lib/people";
import { searchCommunities } from "@/lib/communities";

const SYSTEM_PROMPT = `あなたはM&A（合併・買収）の専門AIアシスタントです。日本のM&A市場に精通しており、以下のデータベースにアクセスできます：

1. **EDINET企業DB** — 上場企業の財務データ・信用スコア・決算短信
2. **大量保有報告書** — 株主構成・大量保有報告の横断検索
3. **gBizINFO** — 500万社以上の法人データ・補助金・特許情報
4. **M&Aニュース** — 8カテゴリのリアルタイムニュース集約
5. **法律・規制DB** — M&A関連73法令のデータベース
6. **学術論文** — OpenAlexからの研究論文検索
7. **YouTube** — M&A関連動画コンテンツ検索
8. **セミナー** — Connpass APIからのイベント情報
9. **人物DB** — M&A関連の著名人物56名
10. **コミュニティDB** — 全国の経営者コミュニティ66団体

回答ルール：
- 必ず日本語で回答する
- データに基づいた回答を心がけ、必要に応じてツールを使用する
- 企業名・EDINETコード・法律名・URLなど出典情報を含める
- 金額は適切な単位（億円、百万円等）で表示する
- 不明な点は正直に伝え、推測で回答しない
- 複数のデータソースを組み合わせて包括的に回答する`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      searchEdinetCompanies: tool({
        description:
          "EDINET DBから上場企業を名前やEDINETコードで検索。財務データ・信用スコアを含む",
        inputSchema: z.object({
          query: z.string().describe("企業名またはEDINETコード"),
        }),
        execute: async ({ query }) => {
          try {
            const companies = await searchEdinetCompanies(query);
            return { results: companies.slice(0, 10), total: companies.length };
          } catch {
            return { error: "EDINET APIキーが未設定またはAPI接続エラー" };
          }
        },
      }),

      getEdinetCompany: tool({
        description:
          "EDINETコードから企業の詳細情報（財務データ・決算・信用スコア）を取得",
        inputSchema: z.object({
          edinetCode: z.string().describe("EDINETコード（例: E02144）"),
        }),
        execute: async ({ edinetCode }) => {
          try {
            return await getEdinetCompany(edinetCode);
          } catch {
            return { error: "企業データの取得に失敗" };
          }
        },
      }),

      getCompanyShareholders: tool({
        description: "企業の大量保有報告書データを取得。5%以上の主要株主一覧",
        inputSchema: z.object({
          edinetCode: z.string().describe("EDINETコード"),
        }),
        execute: async ({ edinetCode }) => {
          try {
            const data = await getCompanyShareholders(edinetCode);
            return { shareholders: data.slice(0, 20), total: data.length };
          } catch {
            return { error: "株主データの取得に失敗" };
          }
        },
      }),

      searchShareholders: tool({
        description:
          "保有者名で大量保有報告書を横断検索。投資ファンドやアクティビストの保有銘柄を調査",
        inputSchema: z.object({
          holderName: z
            .string()
            .describe("保有者名（例: ブラックロック、村上ファンド）"),
        }),
        execute: async ({ holderName }) => {
          try {
            const data = await searchShareholders(holderName);
            return { reports: data.slice(0, 15), total: data.length };
          } catch {
            return { error: "株主検索に失敗" };
          }
        },
      }),

      searchGBizCompanies: tool({
        description:
          "gBizINFOから法人を検索。非上場企業・スタートアップ含む500万社以上のデータ",
        inputSchema: z.object({
          name: z.string().optional().describe("企業名"),
          prefecture: z.string().optional().describe("都道府県"),
        }),
        execute: async ({ name, prefecture }) => {
          try {
            const data = await searchGBizCompanies({
              name,
              prefecture,
              limit: 10,
            });
            return { companies: data["hojin-infos"]?.slice(0, 10) || [] };
          } catch {
            return { error: "gBizINFO APIキーが未設定またはAPI接続エラー" };
          }
        },
      }),

      searchNews: tool({
        description:
          "M&A関連の最新ニュースを検索。買収・合併・TOB・事業承継など",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe("検索キーワード（空欄で全カテゴリ自動集約）"),
        }),
        execute: async ({ query }) => {
          try {
            const items = await searchNews(query);
            return { news: items.slice(0, 15), total: items.length };
          } catch {
            return { error: "ニュース取得に失敗" };
          }
        },
      }),

      searchLaws: tool({
        description:
          "M&A関連の法律・規制を検索。会社法・金融商品取引法・税法・独占禁止法など73法令",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe("検索キーワード（例: 株式交換、TOB、組織再編税制）"),
          category: z
            .string()
            .optional()
            .describe("カテゴリ（例: 会社法、税法、金融商品取引法）"),
        }),
        execute: async ({ query, category }) => {
          const laws = searchLaws(query, category);
          return { laws: laws.slice(0, 15), total: laws.length };
        },
      }),

      searchResearchPapers: tool({
        description: "M&A関連の学術論文をOpenAlexから検索。被引用数順でソート",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "検索キーワード（例: mergers and acquisitions, 企業買収）",
            ),
        }),
        execute: async ({ query }) => {
          try {
            const papers = await searchPapers(query);
            return { papers: papers.slice(0, 10), total: papers.length };
          } catch {
            return { error: "論文検索に失敗" };
          }
        },
      }),

      searchYouTubeVideos: tool({
        description: "M&A関連のYouTube動画を検索",
        inputSchema: z.object({
          query: z.string().describe("検索キーワード"),
        }),
        execute: async ({ query }) => {
          try {
            const videos = await searchVideos(query);
            return { videos: videos.slice(0, 10), total: videos.length };
          } catch {
            return { error: "YouTube APIキーが未設定またはAPI接続エラー" };
          }
        },
      }),

      searchSeminars: tool({
        description: "M&A・経営関連のセミナー・イベントをConnpassから検索",
        inputSchema: z.object({
          keyword: z
            .string()
            .optional()
            .describe("検索キーワード（空欄で全カテゴリ自動集約）"),
        }),
        execute: async ({ keyword }) => {
          try {
            const events = await searchSeminars(keyword);
            return { events: events.slice(0, 10), total: events.length };
          } catch {
            return { error: "セミナー検索に失敗" };
          }
        },
      }),

      searchPeople: tool({
        description:
          "M&A関連の著名人物を検索。アドバイザー・投資家・経営者・アクティビスト・専門家",
        inputSchema: z.object({
          query: z.string().optional().describe("名前・組織名・カテゴリで検索"),
        }),
        execute: async ({ query }) => {
          const people = searchPeople(query);
          return { people: people.slice(0, 15), total: people.length };
        },
      }),

      searchCommunities: tool({
        description: "全国の経営者コミュニティ・業界団体を検索",
        inputSchema: z.object({
          query: z.string().optional().describe("検索キーワード"),
          prefecture: z.string().optional().describe("都道府県で絞り込み"),
        }),
        execute: async ({ query, prefecture }) => {
          const communities = searchCommunities(query, prefecture);
          return {
            communities: communities.slice(0, 15),
            total: communities.length,
          };
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
