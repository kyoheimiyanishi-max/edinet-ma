import {
  getCompany,
  getCompanyShareholders,
  getCompanyFinancials,
  formatYen,
  formatPct,
  formatSharePct,
  creditColor,
  changeColor,
  formatChange,
  getEdinetUrl,
} from "@/lib/edinetdb";
import type { FinancialHistory } from "@/lib/edinetdb";
import { fetchMarketSegment } from "@/lib/market";
import { searchNews, formatPubDate } from "@/lib/news";
import CompanyEmployeeSection from "@/components/CompanyEmployeeSection";
import { FinancialCharts } from "@/components/FinancialCharts";
import type { FinancialChartData } from "@/components/FinancialCharts";
import Link from "next/link";
import { Suspense } from "react";
import CompanyAnalysis from "@/components/CompanyAnalysis";

interface Props {
  params: Promise<{ code: string }>;
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
      <p className="text-xs text-slate-400 mb-1 font-medium">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionCard({
  title,
  badge,
  action,
  children,
}: {
  title: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <h3 className="font-semibold text-slate-700">{title}</h3>
          {badge && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {badge}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
    >
      {children}
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  );
}

// M&A News section (async, wrapped in Suspense)
async function MaNewsSection({ companyName }: { companyName: string }) {
  const shortName = companyName.replace(/株式会社|（株）/g, "").trim();
  const news = await searchNews(`${shortName} M&A 買収`);
  const relevant = news.slice(0, 5);

  if (relevant.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-4">
        関連ニュースなし
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {relevant.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
        >
          <p className="text-sm text-slate-800 font-medium line-clamp-2">
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {item.source && (
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                {item.source}
              </span>
            )}
            {item.pubDate && (
              <span className="text-[10px] text-slate-400">
                {formatPubDate(item.pubDate)}
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

export default async function CompanyPage({ params }: Props) {
  const { code } = await params;

  try {
    const [company, shareholders, financials] = await Promise.all([
      getCompany(code),
      getCompanyShareholders(code),
      getCompanyFinancials(code),
    ]);
    const marketSegment = await fetchMarketSegment(company.sec_code);

    const f = company.latest_financials;
    const e = company.latest_earnings;
    const secCode = company.sec_code?.replace(/0$/, ""); // Remove trailing 0 for Yahoo Finance

    // Build chart data: use historical financials, or fallback to latest year
    const chartData: FinancialChartData[] =
      financials.length > 0
        ? financials.map((fh: FinancialHistory) => ({
            fiscal_year: fh.fiscal_year,
            revenue: fh.revenue,
            operating_income: fh.operating_income,
            net_income: fh.net_income,
            total_assets: fh.total_assets,
            equity: fh.equity,
            cash: fh.cash,
            equity_ratio_official: fh.equity_ratio_official,
            eps: fh.eps,
            bps: fh.bps,
            roe: fh.roe,
            roa: fh.roa,
            market_cap: fh.market_cap,
          }))
        : f
          ? [
              {
                fiscal_year: f.fiscal_year,
                revenue: f.revenue,
                operating_income: f.operating_income,
                net_income: f.net_income,
                total_assets: f.total_assets,
                equity: f.equity,
                cash: f.cash,
                equity_ratio_official: f.equity_ratio_official,
                eps: f.eps,
                bps: f.bps,
                roe: f.roe,
                roa: f.roa,
              },
            ]
          : [];

    // Shareholder analysis
    const byHolder = new Map<string, (typeof shareholders)[0]>();
    for (const s of shareholders) {
      const existing = byHolder.get(s.holder_name);
      if (!existing || s.submit_date_time > existing.submit_date_time) {
        byHolder.set(s.holder_name, s);
      }
    }
    const latestHolders = Array.from(byHolder.values()).sort(
      (a, b) => b.total_holding_ratio - a.total_holding_ratio,
    );

    // Shareholder stats
    const totalHoldingPct = latestHolders.reduce(
      (sum, h) => sum + h.total_holding_ratio,
      0,
    );
    const increasingHolders = latestHolders.filter(
      (h) => h.holding_ratio > h.holding_ratio_previous,
    );
    const decreasingHolders = latestHolders.filter(
      (h) => h.holding_ratio < h.holding_ratio_previous,
    );

    return (
      <div className="space-y-6">
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          企業一覧に戻る
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {company.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded-lg text-slate-500">
                  {company.edinet_code}
                </span>
                {company.sec_code && (
                  <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded-lg text-slate-500">
                    {company.sec_code}
                  </span>
                )}
                <span className="text-xs px-2 py-1 bg-blue-50 rounded-lg text-blue-600">
                  {company.industry}
                </span>
                {marketSegment && (
                  <span className="text-xs px-2 py-1 bg-emerald-50 rounded-lg text-emerald-600 font-medium">
                    {marketSegment}
                  </span>
                )}
                {company.listing_category && !marketSegment && (
                  <span className="text-xs px-2 py-1 bg-emerald-50 rounded-lg text-emerald-600">
                    {company.listing_category}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`px-3.5 py-1.5 rounded-full text-sm font-bold shadow-sm ${creditColor(company.credit_rating)}`}
              >
                {company.credit_rating} ({company.credit_score}pt)
              </span>
              {company.market_cap != null && (
                <span className="text-xs text-slate-500">
                  時価総額: {formatYen(company.market_cap)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs: Quick Links */}
        {company.sec_code && (
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
            <div className="flex flex-wrap gap-3">
              <ExternalLink
                href={`https://finance.yahoo.co.jp/quote/${company.sec_code}.T`}
              >
                Yahoo! ファイナンス（株価）
              </ExternalLink>
              <ExternalLink href={`https://kabutan.jp/stock/?code=${secCode}`}>
                株探（チャート・四季報）
              </ExternalLink>
              <ExternalLink
                href={`https://www.nikkei.com/nkd/company/?scode=${secCode}`}
              >
                日経（企業情報）
              </ExternalLink>
              <ExternalLink href={`https://irbank.net/${secCode}`}>
                IR BANK（IR・財務）
              </ExternalLink>
              <ExternalLink
                href={`https://disclosure2.edinet-fsa.go.jp/WZEK0040.aspx?company=${company.edinet_code}`}
              >
                EDINET（開示書類）
              </ExternalLink>
              {f?.edinet_filing_url && (
                <ExternalLink href={f.edinet_filing_url}>
                  有価証券報告書
                </ExternalLink>
              )}
            </div>
          </div>
        )}

        {/* Assigned Employees */}
        <SectionCard title="担当社員" badge="社員管理">
          <CompanyEmployeeSection
            companyCode={company.edinet_code}
            companyName={company.name}
          />
        </SectionCard>

        {/* M&A Summary / News */}
        <SectionCard title="M&A 関連ニュース" badge="自動検索">
          <Suspense fallback={<div className="shimmer h-32 rounded-xl" />}>
            <MaNewsSection companyName={company.name} />
          </Suspense>
        </SectionCard>

        {/* AI Analysis: Overview, Business Model, Officers, M&A, Strategy */}
        <CompanyAnalysis edinetCode={company.edinet_code} companyName={company.name} />

        {/* Financial Charts */}
        {chartData.length > 0 && (
          <SectionCard
            title="財務推移"
            badge={
              chartData.length > 1
                ? `${chartData[0].fiscal_year}〜${chartData[chartData.length - 1].fiscal_year}年`
                : `${chartData[0].fiscal_year}年`
            }
          >
            <FinancialCharts data={chartData} />
          </SectionCard>
        )}

        {/* Financial Summary - P&L */}
        {f && (
          <SectionCard title="損益計算書 (P/L)" badge={`${f.fiscal_year}年度`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard label="売上高" value={formatYen(f.revenue)} />
              <MetricCard
                label="営業利益"
                value={formatYen(f.operating_income)}
              />
              <MetricCard label="純利益" value={formatYen(f.net_income)} />
              <MetricCard
                label="EPS（1株利益）"
                value={f.eps != null ? `${f.eps.toFixed(1)}円` : "-"}
              />
              {f.avg_annual_salary != null && (
                <MetricCard
                  label="平均年収"
                  value={formatYen(f.avg_annual_salary)}
                  sub={
                    f.avg_age != null ? `平均年齢 ${f.avg_age}歳` : undefined
                  }
                />
              )}
            </div>
          </SectionCard>
        )}

        {/* Balance Sheet */}
        {f && (
          <SectionCard title="貸借対照表 (B/S)" badge={`${f.fiscal_year}年度`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard label="総資産" value={formatYen(f.total_assets)} />
              <MetricCard label="自己資本" value={formatYen(f.equity)} />
              <MetricCard label="現金・現預金" value={formatYen(f.cash)} />
              <MetricCard
                label="自己資本比率"
                value={formatPct(f.equity_ratio_official)}
              />
              <MetricCard
                label="BPS（1株純資産）"
                value={f.bps != null ? `${f.bps.toFixed(1)}円` : "-"}
              />
              {f.roe != null && (
                <MetricCard
                  label="ROE（自己資本利益率）"
                  value={formatPct(f.roe)}
                />
              )}
              {f.roa != null && (
                <MetricCard
                  label="ROA（総資産利益率）"
                  value={formatPct(f.roa)}
                />
              )}
            </div>
          </SectionCard>
        )}

        {/* Latest Earnings */}
        {e && (
          <SectionCard
            title="最新決算"
            badge={`${e.fiscal_year_end} Q${e.quarter}`}
            action={
              e.pdf_url ? (
                <ExternalLink href={e.pdf_url}>決算短信 PDF</ExternalLink>
              ) : undefined
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard
                label="売上高"
                value={formatYen(e.revenue)}
                sub={
                  e.revenue_change != null
                    ? ((
                        <span className={changeColor(e.revenue_change)}>
                          {formatChange(e.revenue_change)}
                        </span>
                      ) as unknown as string)
                    : undefined
                }
              />
              <MetricCard
                label="営業利益"
                value={formatYen(e.operating_income)}
                sub={
                  e.operating_income_change != null
                    ? ((
                        <span
                          className={changeColor(e.operating_income_change)}
                        >
                          {formatChange(e.operating_income_change)}
                        </span>
                      ) as unknown as string)
                    : undefined
                }
              />
              <MetricCard
                label="純利益"
                value={formatYen(e.net_income)}
                sub={
                  e.net_income_change != null
                    ? ((
                        <span className={changeColor(e.net_income_change)}>
                          {formatChange(e.net_income_change)}
                        </span>
                      ) as unknown as string)
                    : undefined
                }
              />
            </div>
          </SectionCard>
        )}

        {/* Shareholder Overview */}
        <SectionCard
          title="株主構成サマリー"
          badge={`${latestHolders.length} 名`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <MetricCard
              label="大量保有者数"
              value={`${latestHolders.length}名`}
            />
            <MetricCard
              label="合計保有比率"
              value={`${(totalHoldingPct * 100).toFixed(1)}%`}
            />
            <MetricCard
              label="保有増加中"
              value={`${increasingHolders.length}名`}
              sub={increasingHolders.length > 0 ? "買い増し傾向" : undefined}
            />
            <MetricCard
              label="保有減少中"
              value={`${decreasingHolders.length}名`}
              sub={decreasingHolders.length > 0 ? "売却傾向" : undefined}
            />
          </div>

          {/* Top holders visual bar */}
          {latestHolders.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-xs text-slate-400 font-medium">
                保有比率トップ5
              </p>
              {latestHolders.slice(0, 5).map((h, i) => {
                const pct = h.total_holding_ratio * 100;
                const delta = h.holding_ratio - h.holding_ratio_previous;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 sm:w-48 text-xs text-slate-700 truncate shrink-0 font-medium">
                      {h.holder_name}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(pct * 2, 100)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-[10px] font-bold text-slate-700">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono w-16 text-right shrink-0 ${changeColor(delta)}`}
                    >
                      {delta !== 0
                        ? (delta > 0 ? "+" : "") +
                          (delta * 100).toFixed(2) +
                          "%"
                        : "-"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Full Shareholder Table */}
        <SectionCard title="大量保有報告書" badge="詳細一覧">
          {latestHolders.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              大量保有報告書のデータなし
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">保有者</th>
                    <th className="pb-3 pr-4 font-medium text-right">
                      保有割合
                    </th>
                    <th className="pb-3 pr-4 font-medium text-right">前回比</th>
                    <th className="pb-3 pr-4 font-medium">目的</th>
                    <th className="pb-3 font-medium">報告日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {latestHolders.map((s, i) => {
                    const delta = s.holding_ratio - s.holding_ratio_previous;
                    return (
                      <tr
                        key={`${s.holder_name}-${i}`}
                        className="hover:bg-blue-50/50"
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-800">
                            {s.holder_name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {s.holder_type}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-right font-mono font-semibold text-slate-800">
                          {formatSharePct(s.total_holding_ratio)}
                        </td>
                        <td
                          className={`py-3 pr-4 text-right font-mono text-xs ${changeColor(delta)}`}
                        >
                          {delta !== 0
                            ? (delta > 0 ? "+" : "") +
                              (delta * 100).toFixed(2) +
                              "%"
                            : "-"}
                        </td>
                        <td
                          className="py-3 pr-4 text-xs text-slate-500 max-w-xs truncate"
                          title={s.purpose || ""}
                        >
                          {s.purpose || "-"}
                        </td>
                        <td className="py-3 text-xs text-slate-400 whitespace-nowrap">
                          <div>{s.filing_trigger_date}</div>
                          <a
                            href={getEdinetUrl(s.doc_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 font-medium transition-colors"
                          >
                            EDINET
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Report History */}
        {shareholders.length > latestHolders.length && (
          <SectionCard title="報告履歴" badge={`${shareholders.length} 件`}>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">書類種別</th>
                    <th className="pb-3 pr-4 font-medium">提出者</th>
                    <th className="pb-3 pr-4 font-medium">保有者</th>
                    <th className="pb-3 pr-4 text-right font-medium">
                      保有割合
                    </th>
                    <th className="pb-3 font-medium">提出日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {shareholders.slice(0, 50).map((s, i) => (
                    <tr
                      key={`hist-${i}`}
                      className="hover:bg-slate-50/80 text-xs"
                    >
                      <td className="py-2.5 pr-4 text-slate-500">
                        {s.document_title}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-700">
                        {s.filer_name}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-700">
                        {s.holder_name}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono">
                        {formatSharePct(s.total_holding_ratio)}
                      </td>
                      <td className="py-2.5 text-slate-400 whitespace-nowrap">
                        {s.submit_date_time?.substring(0, 10)}{" "}
                        <a
                          href={getEdinetUrl(s.doc_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-600 transition-colors"
                        >
                          ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </div>
    );
  } catch {
    return (
      <div className="space-y-4">
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          戻る
        </Link>
        <div className="bg-red-50 border border-red-200/60 rounded-2xl p-6 text-red-700">
          企業データの取得に失敗しました。EDINETコードを確認してください。
        </div>
      </div>
    );
  }
}
