/**
 * EDINET 臨時報告書 (docTypeCode=180) を一括取込するバッチスクリプト。
 *
 * 日付範囲内の各日の書類一覧 API を叩き、M&A 関連の提出事由を
 * 分類して `ma_filings` テーブルに upsert する。
 *
 * 使い方:
 *   # ドライラン (DB 書き込み無し、1 週間分でサンプル確認)
 *   pnpm exec tsx --conditions=react-server \
 *     --env-file=.env --env-file=.env.local \
 *     scripts/ingest-edinet-filings.ts \
 *     --from=2024-11-25 --to=2024-12-01 --dry-run
 *
 *   # 本番取込 (レジューム: 既存 doc_id は upsert される)
 *   pnpm exec tsx --conditions=react-server \
 *     --env-file=.env --env-file=.env.local \
 *     scripts/ingest-edinet-filings.ts \
 *     --from=2024-04-01 --to=2025-12-31
 *
 * データ可用性 (重要):
 *   EDINET API v2 は 2024-04-01 以降の臨時報告書 (docTypeCode=180) のみ
 *   網羅的に返す。それより前の日付を指定しても 0 件になる
 *   (インデックス未整備のため)。
 *
 * 設計:
 *   - 書類一覧 API type=2 のみで完結する (CSV 取得は不要)。
 *   - 提出事由の classification は lib/edinet-ma-parser.ts。
 *   - 土日祝日は API を叩くだけで 0 件が返る。無駄ではあるが
 *     祝日判定を持ち込むと複雑化するため、そのまま叩く。
 *   - レート制限: 250ms/req (実測 15 分弱で 1100 日処理完了見込み)。
 *   - 失敗時は当該日のログを吐いて次の日に進む (途中中断しない)。
 */

import {
  createRateLimiter,
  listCurrentReports,
  EdinetOfficialApiError,
} from "../lib/edinet-official";
import { entryToMaFiling } from "../lib/edinet-ma-parser";
import { upsertFromEdinet } from "../lib/d6e/repos/ma-filings";

interface CliOptions {
  from: string;
  to: string;
  dryRun: boolean;
  throttleMs: number;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: Partial<CliOptions> = { dryRun: false, throttleMs: 250 };
  for (const arg of argv) {
    if (arg.startsWith("--from=")) opts.from = arg.slice(7);
    else if (arg.startsWith("--to=")) opts.to = arg.slice(5);
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg.startsWith("--throttle-ms="))
      opts.throttleMs = Number(arg.slice(14));
  }
  if (!opts.from || !opts.to) {
    console.error(
      "Usage: --from=YYYY-MM-DD --to=YYYY-MM-DD [--dry-run] [--throttle-ms=250]",
    );
    process.exit(1);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.from))
    throw new Error(`invalid --from: ${opts.from}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.to))
    throw new Error(`invalid --to: ${opts.to}`);
  return opts as CliOptions;
}

function* daysBetween(from: string, to: string): Generator<string> {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    yield d.toISOString().slice(0, 10);
  }
}

interface Tally {
  daysProcessed: number;
  daysFailed: number;
  docsSeen: number; // 臨時報告書全体
  docsMatched: number; // M&A 判定された件数
  inserted: number;
  updated: number;
  errors: number;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  console.log(
    `🚀  ingest-edinet-filings  from=${opts.from} to=${opts.to} dryRun=${opts.dryRun} throttle=${opts.throttleMs}ms`,
  );

  const throttle = createRateLimiter(opts.throttleMs);
  const tally: Tally = {
    daysProcessed: 0,
    daysFailed: 0,
    docsSeen: 0,
    docsMatched: 0,
    inserted: 0,
    updated: 0,
    errors: 0,
  };

  for (const date of daysBetween(opts.from, opts.to)) {
    await throttle();
    try {
      const reports = await listCurrentReports(date);
      tally.docsSeen += reports.length;

      let dayMatched = 0;
      for (const entry of reports) {
        const record = entryToMaFiling(entry);
        if (!record) continue;
        dayMatched++;
        tally.docsMatched++;

        if (opts.dryRun) {
          console.log(
            `    🔎  ${record.submitDate}  ${record.eventType.padEnd(18)}  ${record.filerName}  (${record.docId})`,
          );
          continue;
        }

        try {
          const { inserted } = await upsertFromEdinet(record);
          if (inserted) tally.inserted++;
          else tally.updated++;
        } catch (e) {
          tally.errors++;
          const msg = e instanceof Error ? e.message : String(e);
          console.error(
            `    ❌  upsert failed for ${record.docId}: ${msg.slice(0, 160)}`,
          );
        }
      }

      tally.daysProcessed++;
      if (dayMatched > 0 || reports.length > 0) {
        console.log(
          `  📅  ${date}  180-total=${reports.length}  ma-match=${dayMatched}`,
        );
      }
    } catch (e) {
      tally.daysFailed++;
      const msg = e instanceof Error ? e.message : String(e);
      const status =
        e instanceof EdinetOfficialApiError ? ` (status=${e.status})` : "";
      console.error(
        `  ⚠️  ${date}  list failed: ${msg.slice(0, 160)}${status}`,
      );
    }
  }

  console.log("");
  console.log("─".repeat(64));
  console.log(
    `days: ok=${tally.daysProcessed} failed=${tally.daysFailed}  |  docs: 180=${tally.docsSeen} ma=${tally.docsMatched}  |  db: ins=${tally.inserted} upd=${tally.updated} err=${tally.errors}`,
  );

  process.exit(tally.daysFailed > 0 || tally.errors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
