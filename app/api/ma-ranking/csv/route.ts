import { computeRanking, type RankingMode } from "@/lib/ma-ranking";
import { MA_EVENT_TYPE_LABEL } from "@/lib/edinet-ma-parser";
import type { MaEventType } from "@/lib/edinet-ma-parser";
import { csvResponse, toCsv, type CsvCell } from "@/lib/csv";

/**
 * GET /api/ma-ranking/csv
 *
 * /api/ma-ranking と同じクエリで CSV をダウンロードする。
 * ヘッダ行 + 1 企業 1 行 (年別件数・event_type 別件数を横に展開)。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const mode: RankingMode =
    url.searchParams.get("mode") === "period-min" ? "period-min" : "annual-min";
  const thresholdRaw = url.searchParams.get("threshold");
  const threshold = thresholdRaw
    ? Number(thresholdRaw)
    : mode === "annual-min"
      ? 2
      : 1;

  if (!from || !to) {
    return new Response("from と to は必須", { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return new Response("from / to は YYYY-MM-DD 形式", { status: 400 });
  }
  if (!Number.isInteger(threshold) || threshold < 1) {
    return new Response("threshold は 1 以上の整数", { status: 400 });
  }

  const result = await computeRanking({ from, to, mode, threshold });

  const fromYear = Number(from.slice(0, 4));
  const toYear = Number(to.slice(0, 4));
  const years: number[] = [];
  for (let y = fromYear; y <= toYear; y++) years.push(y);

  const eventTypeKeys: MaEventType[] = [
    "stock_acquisition",
    "merger",
    "split",
    "business_transfer",
    "tob",
    "other",
  ];

  const header: CsvCell[] = [
    "順位",
    "会社名",
    "EDINETコード",
    "証券コード",
    "期間合計",
    "年間最大",
    ...years.map((y) => `${y}年`),
    ...eventTypeKeys.map((k) => MA_EVENT_TYPE_LABEL[k]),
    "最新日",
  ];

  const rows: CsvCell[][] = [header];
  result.items.forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.companyName,
      item.edinetCode ?? "",
      item.secCode ?? "",
      item.totalInPeriod,
      item.peakYearlyCount,
      ...years.map((y) => item.yearlyCounts[y] ?? 0),
      ...eventTypeKeys.map((k) => item.byEventType[k] ?? 0),
      item.latestDate,
    ]);
  });

  const csv = toCsv(rows);
  const modeLabel = mode === "annual-min" ? "年間" : "期間";
  const filename = `ma-ranking_${modeLabel}${threshold}件以上_${from}_${to}.csv`;
  return csvResponse(csv, filename);
}
