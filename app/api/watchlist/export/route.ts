import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { findByUser } from "@/lib/d6e/repos/user-watchlists";
import { getCompanyFinancials, type FinancialHistory } from "@/lib/edinetdb";
import { fetchMarketSegment } from "@/lib/market";
import { extractPrefecture } from "@/lib/prefecture";
import { csvResponse, toCsv, type CsvCell } from "@/lib/csv";

export const runtime = "nodejs";

const HISTORY_YEARS = 5;

type FinKey =
  | "revenue"
  | "operating_income"
  | "net_income"
  | "total_assets"
  | "equity"
  | "cash"
  | "roe"
  | "roa"
  | "eps"
  | "bps";

const METRIC_COLS: { key: FinKey; label: string }[] = [
  { key: "revenue", label: "売上" },
  { key: "operating_income", label: "営業利益" },
  { key: "net_income", label: "純利益" },
  { key: "total_assets", label: "総資産" },
  { key: "equity", label: "純資産" },
  { key: "cash", label: "現預金" },
  { key: "roe", label: "ROE" },
  { key: "roa", label: "ROA" },
  { key: "eps", label: "EPS" },
  { key: "bps", label: "BPS" },
];

/**
 * GET /api/watchlist/export?format=wide|long
 *
 * - wide (デフォルト): 1社1行、年度×指標をカラム展開 (ピボット表示向け)
 * - long: 1社×1年度1行 (BI ツール / ピボットテーブルへの取り込み向け)
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "wide") as "wide" | "long";

  const entries = await findByUser(user.email);

  // 各企業の財務履歴 + 市場 + 所在地 を並列フェッチ
  const enriched = await Promise.all(
    entries.map(async (e) => {
      const [history, marketSegment] = await Promise.all([
        e.company.edinetCode
          ? getCompanyFinancials(e.company.edinetCode).catch(
              () => [] as FinancialHistory[],
            )
          : Promise.resolve([] as FinancialHistory[]),
        e.company.secCode
          ? fetchMarketSegment(e.company.secCode).catch(() => null)
          : Promise.resolve(null),
      ]);
      const prefecture = extractPrefecture(e.company.address);
      const sorted = [...history].sort((a, b) => a.fiscal_year - b.fiscal_year);
      return { entry: e, history: sorted, marketSegment, prefecture };
    }),
  );

  const timestamp = new Date().toISOString().slice(0, 10);
  const common = (r: (typeof enriched)[number]): CsvCell[] => [
    r.entry.company.name,
    r.entry.company.secCode?.replace(/0$/, "") ?? "",
    r.entry.company.edinetCode ?? "",
    r.entry.company.corporateNumber ?? "",
    r.entry.company.industry ?? "",
    r.marketSegment ?? "",
    r.prefecture ?? "",
    r.entry.note ?? "",
    r.entry.addedAt.slice(0, 10),
  ];
  const commonHeader: string[] = [
    "企業名",
    "証券コード",
    "EDINETコード",
    "法人番号",
    "業種",
    "上場市場",
    "本社所在地",
    "メモ",
    "ウォッチ追加日",
  ];

  let csv: string;
  let filename: string;

  if (format === "long") {
    // long: 企業名,…,FY,指標ラベル...
    const header: string[] = [...commonHeader, "FY"];
    for (const m of METRIC_COLS) header.push(m.label);
    const rows: CsvCell[][] = [header];
    for (const r of enriched) {
      if (r.history.length === 0) {
        rows.push([...common(r), "", ...METRIC_COLS.map(() => "")]);
        continue;
      }
      for (const h of r.history) {
        const vals: CsvCell[] = METRIC_COLS.map((m) => h[m.key] ?? "");
        rows.push([...common(r), h.fiscal_year, ...vals]);
      }
    }
    csv = toCsv(rows);
    filename = `watchlist_long_${timestamp}.csv`;
  } else {
    // wide: 指標×FYのマトリックス。各指標ブロックは 古→新 で HISTORY_YEARS 列。
    // 列ヘッダ例: "売上_FY2020","売上_FY2021",... (年は各社で揃わないので
    // 相対年度 "FY-4"〜"FY-0" を使うほうが揃えやすい)。相対 FY オフセットを採用。
    const header: string[] = [...commonHeader, "最新FY"];
    for (const m of METRIC_COLS) {
      for (let i = HISTORY_YEARS - 1; i >= 0; i--) {
        header.push(i === 0 ? `${m.label}_FY` : `${m.label}_FY-${i}`);
      }
    }
    const rows: CsvCell[][] = [header];
    for (const r of enriched) {
      const tail = r.history.slice(-HISTORY_YEARS);
      const latest = tail[tail.length - 1];
      const line: CsvCell[] = [...common(r), latest?.fiscal_year ?? ""];
      for (const m of METRIC_COLS) {
        for (let i = HISTORY_YEARS - 1; i >= 0; i--) {
          const h = tail[tail.length - 1 - i];
          line.push(h ? (h[m.key] ?? "") : "");
        }
      }
      rows.push(line);
    }
    csv = toCsv(rows);
    filename = `watchlist_${timestamp}.csv`;
  }

  return csvResponse(csv, filename);
}
