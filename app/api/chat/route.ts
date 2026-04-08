import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { getModel } from "@/lib/ai-model";
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
import { search as searchSeminars } from "@/lib/d6e/repos/seminars";
import { search as searchPeople } from "@/lib/d6e/repos/people";
import { search as searchCommunities } from "@/lib/d6e/repos/communities";
import type { AdvisorType } from "@/lib/tax-advisors";
import { search as searchAdvisors } from "@/lib/d6e/repos/tax-advisors";
import type { BankType } from "@/lib/banks";
import { search as searchBanks } from "@/lib/d6e/repos/banks";
import {
  search as searchMinutes,
  findByProject as getMinutesByProject,
  findByParticipant as getMinutesByParticipant,
  findAll as getAllMinutes,
  update as updateMinute,
} from "@/lib/d6e/repos/minutes";
import type { ProjectStatus } from "@/lib/projects";
import {
  search as searchProjects,
  findAll as getAllProjects,
  update as updateProject,
} from "@/lib/d6e/repos/projects";
import type { CompanyAssignment } from "@/lib/employees";
import {
  findAll as getAllEmployees,
  addAssignment,
} from "@/lib/d6e/repos/employees";

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
11. **税理士・会計士DB** — M&A対応の税理士法人・会計事務所・FAS
12. **銀行・金融機関DB** — メガバンクから地銀・信金までM&A対応金融機関
13. **議事録DB** — 社内会議の議事録・決定事項・アクションアイテム
14. **プロジェクトDB** — M&A案件のプロジェクト管理
15. **社員DB** — 社員情報と企業担当割り当て

回答ルール：
- 必ず日本語で回答する
- データに基づいた回答を心がけ、必要に応じてツールを使用する
- 企業名・EDINETコード・法律名・URLなど出典情報を含める
- 金額は適切な単位（億円、百万円等）で表示する
- 不明な点は正直に伝え、推測で回答しない
- 複数のデータソースを組み合わせて包括的に回答する

議事録に関する特別ルール：
- 議事録の内容からプロジェクトのステータス変更が必要と判断した場合は、updateProjectStatusツールで自動更新する
- 議事録から社員の担当割り当て変更が必要と判断した場合は、updateEmployeeAssignmentツールで自動更新する
- アクションアイテムのステータス変更が必要な場合は、updateMinuteActionStatusツールで更新する
- ユーザーに「議事録をもとにステータスを更新して」と言われたら、議事録を検索し内容を分析して適切なステータス更新を行う`;

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: getModel("sonnet"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
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
          } catch (err) {
            console.error("[chat.searchEdinetCompanies]", err);
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
          } catch (err) {
            console.error("[chat.getEdinetCompany]", err);
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
          } catch (err) {
            console.error("[chat.getCompanyShareholders]", err);
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
          } catch (err) {
            console.error("[chat.searchShareholders]", err);
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
          } catch (err) {
            console.error("[chat.searchGBizCompanies]", err);
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
          } catch (err) {
            console.error("[chat.searchNews]", err);
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
          } catch (err) {
            console.error("[chat.searchResearchPapers]", err);
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
          } catch (err) {
            console.error("[chat.searchYouTubeVideos]", err);
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
            const events = await searchSeminars({ query: keyword });
            return { events: events.slice(0, 10), total: events.length };
          } catch (err) {
            console.error("[chat.searchSeminars]", err);
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
          const people = await searchPeople({ query });
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
          const communities = await searchCommunities({ query, prefecture });
          return {
            communities: communities.slice(0, 15),
            total: communities.length,
          };
        },
      }),

      searchTaxAdvisors: tool({
        description: "M&A・事業承継に対応する税理士法人・会計事務所・FASを検索",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe(
              "検索キーワード（例: 事業承継、デロイト、バリュエーション）",
            ),
          type: z
            .string()
            .optional()
            .describe("種別（税理士法人、Big4、FAS、M&A特化 等）"),
          prefecture: z.string().optional().describe("都道府県"),
        }),
        execute: async ({ query, type, prefecture }) => {
          const advisors = await searchAdvisors({
            query,
            type: type as AdvisorType | undefined,
            prefecture,
          });
          return { advisors: advisors.slice(0, 15), total: advisors.length };
        },
      }),

      searchBanks: tool({
        description:
          "M&Aアドバイザリー・事業承継融資に対応する銀行・証券・金融機関を検索",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe("検索キーワード（例: 三菱UFJ、事業承継融資）"),
          type: z
            .string()
            .optional()
            .describe("種別（メガバンク、地方銀行、証券会社、政策金融 等）"),
          prefecture: z.string().optional().describe("都道府県"),
        }),
        execute: async ({ query, type, prefecture }) => {
          const banks = await searchBanks({
            query,
            type: type as BankType | undefined,
            prefecture,
          });
          return { banks: banks.slice(0, 15), total: banks.length };
        },
      }),

      // ---- 議事録・プロジェクト・社員連携ツール ----

      searchMeetingMinutes: tool({
        description:
          "社内会議の議事録を検索。タイトル・内容・参加者・決定事項・アクションアイテムを横断検索",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe("検索キーワード（タイトル、内容、参加者名等）"),
        }),
        execute: async ({ query }) => {
          const results = await (query
            ? searchMinutes(query)
            : getAllMinutes());
          return { minutes: results.slice(0, 20), total: results.length };
        },
      }),

      getMinutesByProject: tool({
        description: "特定プロジェクトに関連する議事録を取得",
        inputSchema: z.object({
          projectId: z.string().describe("プロジェクトID"),
        }),
        execute: async ({ projectId }) => {
          const results = await getMinutesByProject(projectId);
          return { minutes: results, total: results.length };
        },
      }),

      getMinutesByParticipant: tool({
        description: "特定の参加者が出席した議事録を検索",
        inputSchema: z.object({
          name: z.string().describe("参加者名"),
        }),
        execute: async ({ name }) => {
          const results = await getMinutesByParticipant(name);
          return { minutes: results.slice(0, 20), total: results.length };
        },
      }),

      searchMaProjects: tool({
        description:
          "M&A案件のプロジェクトを検索。名前・ステータス・関連企業で検索",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe("検索キーワード（プロジェクト名、ステータス、企業名等）"),
        }),
        execute: async ({ query }) => {
          const results = await (query
            ? searchProjects(query)
            : getAllProjects());
          return { projects: results.slice(0, 20), total: results.length };
        },
      }),

      getEmployeeList: tool({
        description: "社員一覧と担当企業情報を取得",
        inputSchema: z.object({
          query: z
            .string()
            .optional()
            .describe("社員名や部署で絞り込み（省略で全件）"),
        }),
        execute: async ({ query }) => {
          const all = await getAllEmployees();
          if (!query) return { employees: all, total: all.length };
          const q = query.toLowerCase();
          const filtered = all.filter(
            (e) =>
              e.name.toLowerCase().includes(q) ||
              e.department.toLowerCase().includes(q),
          );
          return { employees: filtered, total: filtered.length };
        },
      }),

      updateProjectStatus: tool({
        description:
          "プロジェクトのステータスを更新。議事録の内容から判断してステータスを変更する際に使用",
        inputSchema: z.object({
          projectId: z.string().describe("プロジェクトID"),
          status: z
            .string()
            .describe(
              "新しいステータス（企画中/調査中/交渉中/DD実施中/契約締結/完了/中止）",
            ),
          reason: z
            .string()
            .describe("ステータス変更の理由（どの議事録のどの決定に基づくか）"),
        }),
        execute: async ({ projectId, status, reason }) => {
          const result = await updateProject(projectId, {
            status: status as ProjectStatus,
          });
          if (!result)
            return { error: "プロジェクトが見つかりません", projectId };
          return {
            success: true,
            project: result.name,
            newStatus: status,
            reason,
          };
        },
      }),

      updateEmployeeAssignment: tool({
        description:
          "社員の企業担当割り当てを追加・更新。議事録から担当変更が判明した場合に使用",
        inputSchema: z.object({
          employeeName: z.string().describe("社員名"),
          companyCode: z.string().describe("EDINETコード"),
          companyName: z.string().describe("企業名"),
          role: z.string().describe("担当区分（主担当/副担当/サポート）"),
          status: z
            .string()
            .describe("ステータス（アクティブ/フォロー中/完了）"),
          note: z.string().optional().describe("メモ"),
        }),
        execute: async ({
          employeeName,
          companyCode,
          companyName,
          role,
          status,
          note,
        }) => {
          const employees = await getAllEmployees();
          const emp = employees.find((e) => e.name === employeeName);
          if (!emp) return { error: `社員「${employeeName}」が見つかりません` };
          const result = await addAssignment(emp.id, {
            companyCode,
            companyName,
            role: role as CompanyAssignment["role"],
            status: status as CompanyAssignment["status"],
            note: note ?? "",
          });
          if (!result) return { error: "割り当て更新に失敗しました" };
          return {
            success: true,
            employee: employeeName,
            company: companyName,
            role,
            status,
          };
        },
      }),

      updateMinuteActionStatus: tool({
        description:
          "議事録のアクションアイテムのステータスを更新。進捗報告に基づいてステータスを変更",
        inputSchema: z.object({
          minuteId: z.string().describe("議事録ID"),
          actionIndex: z
            .number()
            .describe("アクションアイテムのインデックス（0始まり）"),
          newStatus: z
            .string()
            .describe("新しいステータス（未着手/進行中/完了）"),
        }),
        execute: async ({ minuteId, actionIndex, newStatus }) => {
          const all = await getAllMinutes();
          const minute = all.find((m) => m.id === minuteId);
          if (!minute) return { error: "議事録が見つかりません" };
          if (actionIndex < 0 || actionIndex >= minute.actionItems.length)
            return { error: "アクションアイテムのインデックスが不正です" };
          const updatedActions = [...minute.actionItems];
          updatedActions[actionIndex] = {
            ...updatedActions[actionIndex],
            status: newStatus as "未着手" | "進行中" | "完了",
          };
          const result = await updateMinute(minuteId, {
            actionItems: updatedActions,
          });
          if (!result) return { error: "更新に失敗しました" };
          return {
            success: true,
            task: updatedActions[actionIndex].task,
            newStatus,
          };
        },
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
