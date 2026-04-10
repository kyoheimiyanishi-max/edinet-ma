import { findAll as findAllSellers } from "@/lib/d6e/repos/sellers";
import { search as searchCompanies } from "@/lib/d6e/repos/companies";
import { findAllLogs } from "@/lib/d6e/repos/outreach";
import { findAll as findAllTimeEntries } from "@/lib/d6e/repos/time-entries";
import { findAll as findAllEvents } from "@/lib/d6e/repos/events";
import { SELLER_STAGES, type SellerStage } from "@/lib/sellers";

/**
 * KPI ダッシュボード: 売主ファネル・買手開拓状況・送付活動・工数・
 * イベントを横断的に集計して表示する。
 *
 * 集計は Server Component でその場計算 (新テーブル不要)。
 */

export const dynamic = "force-dynamic";

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setHours(0, 0, 0, 0);
  return new Date(date.setDate(diff));
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

export default async function KpiDashboardPage() {
  const [sellers, buyers, outreachLogs, timeEntries, events] =
    await Promise.all([
      findAllSellers(),
      searchCompanies({ isBuyer: true, limit: 5000 }),
      findAllLogs(2000),
      findAllTimeEntries(2000),
      findAllEvents(500),
    ]);

  const now = new Date();
  const weekStart = startOfWeek(now);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // ---- 売主ファネル ----
  const sellerFunnel: Record<SellerStage, number> = {
    初回面談: 0,
    情報収集: 0,
    買い手選定: 0,
    打診中: 0,
    交渉中: 0,
    成約: 0,
    見送り: 0,
  };
  sellers.forEach((s) => {
    sellerFunnel[s.stage] = (sellerFunnel[s.stage] ?? 0) + 1;
  });
  const activeSellers = sellers.filter(
    (s) => s.stage !== "成約" && s.stage !== "見送り",
  ).length;
  const closedSellers = sellers.filter((s) => s.stage === "成約").length;

  // ---- 買手プロスペクト ----
  const buyerFunnel: Record<string, number> = {};
  buyers.forEach((b) => {
    const k = b.buyerStatus ?? "未分類";
    buyerFunnel[k] = (buyerFunnel[k] ?? 0) + 1;
  });
  const strongBuyers = buyers.filter((b) => b.strongBuyer).length;

  // ---- 送付活動 ----
  const outreachThisWeek = outreachLogs.filter(
    (l) => new Date(l.sentAt) >= weekStart,
  ).length;
  const outreachThisMonth = outreachLogs.filter(
    (l) => new Date(l.sentAt) >= thisMonth,
  ).length;
  const replied = outreachLogs.filter((l) => l.status === "replied").length;
  const responseRate =
    outreachLogs.length > 0 ? (replied / outreachLogs.length) * 100 : 0;
  const channelBreakdown: Record<string, number> = {};
  outreachLogs.forEach((l) => {
    channelBreakdown[l.channel] = (channelBreakdown[l.channel] ?? 0) + 1;
  });

  // ---- 工数 ----
  const timeThisWeek = timeEntries
    .filter((t) => new Date(t.date) >= weekStart)
    .reduce((a, t) => a + t.hours, 0);
  const timeThisMonth = timeEntries
    .filter((t) => new Date(t.date) >= thisMonth)
    .reduce((a, t) => a + t.hours, 0);
  const timeByCategory: Record<string, number> = {};
  timeEntries
    .filter((t) => new Date(t.date) >= thisMonth)
    .forEach((t) => {
      timeByCategory[t.category] = (timeByCategory[t.category] ?? 0) + t.hours;
    });

  // ---- イベント ----
  const today = now.toISOString().slice(0, 10);
  const upcomingEvents = events.filter(
    (e) => e.date >= today && e.status === "予定",
  ).length;
  const completedEventsThisMonth = events.filter(
    (e) => e.status === "完了" && new Date(e.date) >= thisMonth,
  ).length;

  // ---- 時系列: 直近 14 日の送付数 ----
  const dailyOutreach: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    const iso = d.toISOString().slice(0, 10);
    const count = outreachLogs.filter(
      (l) => l.sentAt.slice(0, 10) === iso,
    ).length;
    dailyOutreach.push({ date: iso, count });
  }
  const maxDaily = Math.max(...dailyOutreach.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">KPI ダッシュボード</h2>
        <p className="text-sm text-slate-500 mt-1">
          売主ファネル・買手開拓・送付活動・工数・イベントを横断集計
        </p>
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="アクティブ売主" value={activeSellers} color="blue" />
        <KpiCard label="成約" value={closedSellers} color="emerald" />
        <KpiCard label="買手候補" value={buyers.length} color="indigo" />
        <KpiCard label="ストロング買手" value={strongBuyers} color="rose" />
        <KpiCard label="今週の送付" value={outreachThisWeek} color="purple" />
        <KpiCard
          label="今月の工数"
          value={`${timeThisMonth.toFixed(0)}h`}
          color="amber"
        />
      </div>

      {/* Seller funnel */}
      <Section title="売主ファネル (Stage)">
        <div className="space-y-2">
          {SELLER_STAGES.map((stage) => {
            const count = sellerFunnel[stage];
            const maxCount = Math.max(...Object.values(sellerFunnel), 1);
            const pct = (count / maxCount) * 100;
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600 w-20 text-right">
                  {stage}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${pct}%` }}
                  >
                    {count > 0 && (
                      <span className="text-[10px] text-white font-bold">
                        {count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-500 w-10">{count}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Buyer funnel */}
      <Section title="買手開拓状況">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(buyerFunnel)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <div
                key={status}
                className="bg-slate-50 rounded-xl p-3 text-center"
              >
                <p className="text-xs text-slate-500 font-medium">{status}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {count.toLocaleString()}
                </p>
              </div>
            ))}
        </div>
      </Section>

      {/* Outreach activity */}
      <Section title="送付活動 (直近 14 日)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MiniStat
            label="総送付数"
            value={outreachLogs.length.toLocaleString()}
          />
          <MiniStat label="今月" value={outreachThisMonth.toLocaleString()} />
          <MiniStat label="返信あり" value={replied.toLocaleString()} />
          <MiniStat label="返信率" value={`${responseRate.toFixed(1)}%`} />
        </div>
        <div className="flex items-end gap-1 h-24">
          {dailyOutreach.map((d) => {
            const height = (d.count / maxDaily) * 100;
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div className="w-full flex items-end flex-1">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{
                      height: `${height}%`,
                      minHeight: d.count > 0 ? "4px" : "0",
                    }}
                    title={`${d.date}: ${d.count}`}
                  />
                </div>
                <span className="text-[9px] text-slate-400">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        {Object.keys(channelBreakdown).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 mb-2 font-medium">
              チャネル別
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(channelBreakdown).map(([ch, count]) => (
                <span
                  key={ch}
                  className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700"
                >
                  {ch}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Time tracking */}
      <Section title="工数 (今月)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <MiniStat label="今週" value={`${timeThisWeek.toFixed(1)}h`} />
          <MiniStat label="今月" value={`${timeThisMonth.toFixed(1)}h`} />
          <MiniStat label="記録総数" value={timeEntries.length.toString()} />
        </div>
        {Object.keys(timeByCategory).length > 0 && (
          <div className="space-y-2">
            {Object.entries(timeByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, hrs]) => {
                const pct = (hrs / timeThisMonth) * 100;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600 w-20 text-right">
                      {cat}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-20 text-right font-mono">
                      {hrs.toFixed(1)}h ({pct.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </Section>

      {/* Events */}
      <Section title="イベント">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MiniStat label="予定 (今後)" value={upcomingEvents.toString()} />
          <MiniStat
            label="今月完了"
            value={completedEventsThisMonth.toString()}
          />
          <MiniStat label="総数" value={events.length.toString()} />
        </div>
      </Section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: "blue" | "emerald" | "indigo" | "rose" | "purple" | "amber";
}) {
  const colors: Record<string, string> = {
    blue: "text-blue-700",
    emerald: "text-emerald-700",
    indigo: "text-indigo-700",
    rose: "text-rose-700",
    purple: "text-purple-700",
    amber: "text-amber-700",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}
