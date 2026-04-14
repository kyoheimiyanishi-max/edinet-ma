import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { findByUser } from "@/lib/d6e/repos/user-watchlists";
import {
  getCompanyFinancials,
  formatYen,
  type FinancialHistory,
} from "@/lib/edinetdb";
import { fetchMarketSegment } from "@/lib/market";
import { extractPrefecture } from "@/lib/prefecture";
import WatchlistMarkSeen from "@/components/WatchlistMarkSeen";
import WatchlistView, {
  type WatchlistViewItem,
} from "@/components/WatchlistView";

export const dynamic = "force-dynamic";

type MetricKey = "revenue" | "operating_income" | "net_income" | "cash";

const METRIC_DEFS: { key: MetricKey; label: string }[] = [
  { key: "revenue", label: "売上" },
  { key: "operating_income", label: "営業利益" },
  { key: "net_income", label: "純利益" },
  { key: "cash", label: "現預金" },
];

const SPARK_YEARS = 5;

function diffPct(
  latest: number | null,
  previous: number | null,
): number | null {
  if (latest == null || previous == null || previous === 0) return null;
  return ((latest - previous) / Math.abs(previous)) * 100;
}

/**
 * ウォッチ企業ごとに EDINET の財務履歴を取得し、最新 SPARK_YEARS 期を古い順で返す。
 * 新着判定 (isNew) は最新期の fiscal_year が last_seen_fiscal_year より新しいか。
 */
async function loadCard(params: {
  edinetCode?: string;
  lastSeenFiscalYear?: number;
}) {
  if (!params.edinetCode) {
    return {
      history: [] as FinancialHistory[],
      latest: null as FinancialHistory | null,
      previous: null as FinancialHistory | null,
      isNew: false,
    };
  }
  const rows = await getCompanyFinancials(params.edinetCode).catch(
    () => [] as FinancialHistory[],
  );
  // 古い → 新しい順
  const sortedAsc = [...rows].sort((a, b) => a.fiscal_year - b.fiscal_year);
  const tail = sortedAsc.slice(-SPARK_YEARS);
  const latest = tail[tail.length - 1] ?? null;
  const previous = tail[tail.length - 2] ?? null;
  const isNew =
    latest != null &&
    params.lastSeenFiscalYear != null &&
    latest.fiscal_year > params.lastSeenFiscalYear;
  return { history: tail, latest, previous, isNew };
}

export default async function WatchlistPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <p className="text-slate-500">
          ウォッチリストを表示するにはログインが必要です
        </p>
      </div>
    );
  }

  const entries = await findByUser(user.email);
  const enriched = await Promise.all(
    entries.map(async (e) => {
      const [card, marketSegment] = await Promise.all([
        loadCard({
          edinetCode: e.company.edinetCode,
          lastSeenFiscalYear: e.lastSeenFiscalYear,
        }),
        e.company.secCode
          ? fetchMarketSegment(e.company.secCode).catch(() => null)
          : Promise.resolve(null),
      ]);
      const prefecture = extractPrefecture(e.company.address);
      return { entry: e, ...card, marketSegment, prefecture };
    }),
  );

  // 「既読」更新に渡すペイロード (新着がある行だけスナップショットを最新値に差し替え)
  const seenPayloads = enriched
    .filter((r) => r.isNew && r.latest && r.entry.company.edinetCode)
    .map((r) => ({
      edinetCode: r.entry.company.edinetCode!,
      fiscalYear: r.latest!.fiscal_year,
      revenue: r.latest!.revenue,
      operatingIncome: r.latest!.operating_income,
      netIncome: r.latest!.net_income,
      equity: r.latest!.equity,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-800">ウォッチリスト</h2>
          <p className="text-xs text-slate-500 mt-1">
            注目企業 {entries.length.toLocaleString()} 社 —
            最新決算の前期比と、前回閲覧時からの新着開示を表示
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {entries.length > 0 && (
            <>
              <a
                href="/api/watchlist/export?format=wide"
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold inline-flex items-center gap-1"
                title="1社1行、5期分をカラム展開 (Excel 直接閲覧向け)"
              >
                📥 ピボット形式 (CSV)
              </a>
              <a
                href="/api/watchlist/export?format=long"
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold inline-flex items-center gap-1"
                title="1社×1年度1行 (ピボットテーブル/BIツール向け)"
              >
                📥 縦持ち形式 (CSV)
              </a>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 text-xs text-slate-500 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            前期比 +
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
            前期比 −
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              NEW
            </span>
            新着決算
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
          <p className="text-slate-500">ウォッチ中の企業はまだありません</p>
          <p className="text-xs text-slate-400">
            <Link href="/search" className="text-blue-600 hover:underline">
              企業検索
            </Link>{" "}
            から気になる企業のページを開き、「☆ ウォッチ」ボタンで追加できます
          </p>
        </div>
      ) : (
        <WatchlistView
          items={enriched.map<WatchlistViewItem>(
            ({
              entry,
              history,
              latest,
              previous,
              isNew,
              marketSegment,
              prefecture,
            }) => {
              const metrics = METRIC_DEFS.map((m) => {
                const latestVal = latest?.[m.key] ?? null;
                const previousVal = previous?.[m.key] ?? null;
                return {
                  label: m.label,
                  latestText: formatYen(latestVal),
                  changePct: diffPct(latestVal, previousVal),
                  series: history.map((h) => ({
                    year: h.fiscal_year,
                    value: (h[m.key] as number | null) ?? null,
                  })),
                };
              });
              return {
                entry: {
                  id: entry.id,
                  companyId: entry.companyId,
                  name: entry.company.name,
                  industry: entry.company.industry,
                  secCode: entry.company.secCode,
                  corporateNumber: entry.company.corporateNumber,
                  edinetCode: entry.company.edinetCode,
                  note: entry.note ?? null,
                },
                latestFiscalYear: latest?.fiscal_year ?? null,
                isNew,
                marketSegment,
                prefecture,
                metrics,
              };
            },
          )}
        />
      )}

      <WatchlistMarkSeen payloads={seenPayloads} />
    </div>
  );
}
