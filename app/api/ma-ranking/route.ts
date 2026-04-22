import { NextResponse } from "next/server";

import { computeRanking, type RankingMode } from "@/lib/ma-ranking";

/**
 * GET /api/ma-ranking
 *
 * クエリパラメータ:
 *   from        - YYYY-MM-DD (必須)
 *   to          - YYYY-MM-DD (必須)
 *   mode        - 'annual-min' | 'period-min' (既定: 'annual-min')
 *                   annual-min: 対象期間の「いずれかの年」で件数 >= threshold
 *                   period-min: 期間全体の総件数 >= threshold
 *   threshold   - 整数 (既定: mode='annual-min' → 2, 'period-min' → 1)
 *
 * ma_filings (EDINET 臨時報告書) と ma_deals (ニュース) を UNION し
 * 企業単位で集計したランキングを返す。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const modeRaw = url.searchParams.get("mode") ?? "annual-min";
  const thresholdRaw = url.searchParams.get("threshold");

  if (!from || !to) {
    return NextResponse.json(
      { error: "from と to (YYYY-MM-DD) は必須です" },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json(
      { error: "from / to は YYYY-MM-DD 形式で指定してください" },
      { status: 400 },
    );
  }
  if (from > to) {
    return NextResponse.json(
      { error: "from が to より後になっています" },
      { status: 400 },
    );
  }
  if (modeRaw !== "annual-min" && modeRaw !== "period-min") {
    return NextResponse.json(
      { error: "mode は 'annual-min' または 'period-min' を指定してください" },
      { status: 400 },
    );
  }
  const mode = modeRaw as RankingMode;
  const threshold = thresholdRaw
    ? Number(thresholdRaw)
    : mode === "annual-min"
      ? 2
      : 1;
  if (!Number.isInteger(threshold) || threshold < 1) {
    return NextResponse.json(
      { error: "threshold は 1 以上の整数で指定してください" },
      { status: 400 },
    );
  }

  try {
    const result = await computeRanking({ from, to, mode, threshold });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[/api/ma-ranking] failed:", message);
    return NextResponse.json(
      { error: "集計に失敗しました", detail: message.slice(0, 200) },
      { status: 500 },
    );
  }
}
