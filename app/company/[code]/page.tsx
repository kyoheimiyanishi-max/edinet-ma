import {
  getCompany,
  getCompanyShareholders,
  formatYen,
  formatPct,
  formatSharePct,
  creditColor,
  changeColor,
  formatChange,
  getEdinetUrl,
} from "@/lib/edinetdb";
import Link from "next/link";

interface Props {
  params: Promise<{ code: string }>;
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function CompanyPage({ params }: Props) {
  const { code } = await params;

  try {
    const [company, shareholders] = await Promise.all([
      getCompany(code),
      getCompanyShareholders(code),
    ]);

    const f = company.latest_financials;
    const e = company.latest_earnings;

    // Group shareholder reports by holder name (latest per holder)
    const byHolder = new Map<string, typeof shareholders[0]>();
    for (const s of shareholders) {
      const existing = byHolder.get(s.holder_name);
      if (!existing || s.submit_date_time > existing.submit_date_time) {
        byHolder.set(s.holder_name, s);
      }
    }
    const latestHolders = Array.from(byHolder.values())
      .sort((a, b) => b.total_holding_ratio - a.total_holding_ratio);

    return (
      <div className="space-y-6">
        {/* Back */}
        <Link href="/" className="text-sm text-blue-600 hover:underline">← 企業一覧に戻る</Link>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{company.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {company.edinet_code}
                {company.sec_code && ` / 証券コード: ${company.sec_code}`}
                {" / "}{company.industry}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${creditColor(company.credit_rating)}`}>
                信用スコア {company.credit_rating} ({company.credit_score}点)
              </span>
              {f?.edinet_filing_url && (
                <a
                  href={f.edinet_filing_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  EDINET 有価証券報告書 ↗
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Financials */}
        {f && (
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-3">
              財務サマリー
              <span className="ml-2 text-sm font-normal text-gray-400">{f.fiscal_year}年度</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <MetricCard label="売上高" value={formatYen(f.revenue)} />
              <MetricCard label="営業利益" value={formatYen(f.operating_income)} />
              <MetricCard label="純利益" value={formatYen(f.net_income)} />
              <MetricCard label="総資産" value={formatYen(f.total_assets)} />
              <MetricCard label="自己資本" value={formatYen(f.equity)} />
              <MetricCard label="現金・現預金" value={formatYen(f.cash)} />
              <MetricCard label="自己資本比率" value={formatPct(f.equity_ratio_official)} />
              <MetricCard label="EPS" value={f.eps != null ? `${f.eps.toFixed(1)}円` : "-"} />
              <MetricCard label="BPS" value={f.bps != null ? `${f.bps.toFixed(1)}円` : "-"} />
              {f.avg_annual_salary != null && (
                <MetricCard label="平均年収" value={formatYen(f.avg_annual_salary)} sub={f.avg_age != null ? `平均年齢 ${f.avg_age}歳` : undefined} />
              )}
            </div>
          </section>
        )}

        {/* Latest Earnings */}
        {e && (
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h3 className="font-semibold text-gray-700">
                最新決算
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {e.fiscal_year_end} Q{e.quarter}
                </span>
              </h3>
              {e.pdf_url && (
                <a href={e.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline">決算短信 PDF ↗</a>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard
                label="売上高"
                value={formatYen(e.revenue)}
                sub={e.revenue_change != null ? <span className={changeColor(e.revenue_change)}>{formatChange(e.revenue_change)}</span> as unknown as string : undefined}
              />
              <MetricCard
                label="営業利益"
                value={formatYen(e.operating_income)}
                sub={e.operating_income_change != null ? <span className={changeColor(e.operating_income_change)}>{formatChange(e.operating_income_change)}</span> as unknown as string : undefined}
              />
              <MetricCard
                label="純利益"
                value={formatYen(e.net_income)}
                sub={e.net_income_change != null ? <span className={changeColor(e.net_income_change)}>{formatChange(e.net_income_change)}</span> as unknown as string : undefined}
              />
            </div>
          </section>
        )}

        {/* Shareholders (大量保有報告書) */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">
              大量保有報告書
              <span className="ml-2 text-sm font-normal text-gray-400">5%以上の主要株主</span>
            </h3>
            <span className="text-sm text-gray-500">{latestHolders.length} 名</span>
          </div>

          {latestHolders.length === 0 ? (
            <p className="text-gray-400 text-sm">大量保有報告書のデータなし</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-2 pr-4 font-medium text-gray-600">保有者</th>
                    <th className="pb-2 pr-4 font-medium text-gray-600 text-right">保有割合</th>
                    <th className="pb-2 pr-4 font-medium text-gray-600 text-right">前回比</th>
                    <th className="pb-2 pr-4 font-medium text-gray-600">目的</th>
                    <th className="pb-2 font-medium text-gray-600">報告日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {latestHolders.map((s, i) => {
                    const delta = s.holding_ratio - s.holding_ratio_previous;
                    return (
                      <tr key={`${s.holder_name}-${i}`} className="hover:bg-blue-50">
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-gray-800">{s.holder_name}</p>
                          <p className="text-xs text-gray-400">{s.holder_type}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono font-semibold">
                          {formatSharePct(s.total_holding_ratio)}
                        </td>
                        <td className={`py-2.5 pr-4 text-right font-mono text-xs ${changeColor(delta)}`}>
                          {delta !== 0 ? (delta > 0 ? "+" : "") + (delta * 100).toFixed(2) + "%" : "-"}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-gray-500 max-w-xs truncate" title={s.purpose || ""}>
                          {s.purpose || "-"}
                        </td>
                        <td className="py-2.5 text-xs text-gray-400 whitespace-nowrap">
                          <div>{s.filing_trigger_date}</div>
                          <a
                            href={getEdinetUrl(s.doc_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            EDINET ↗
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Full report history */}
        {shareholders.length > latestHolders.length && (
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-3">
              報告履歴
              <span className="ml-2 text-sm font-normal text-gray-400">{shareholders.length} 件</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="pb-2 pr-4">書類種別</th>
                    <th className="pb-2 pr-4">提出者</th>
                    <th className="pb-2 pr-4">保有者</th>
                    <th className="pb-2 pr-4 text-right">保有割合</th>
                    <th className="pb-2">提出日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shareholders.slice(0, 50).map((s, i) => (
                    <tr key={`hist-${i}`} className="hover:bg-gray-50 text-xs">
                      <td className="py-2 pr-4 text-gray-500">{s.document_title}</td>
                      <td className="py-2 pr-4 text-gray-700">{s.filer_name}</td>
                      <td className="py-2 pr-4 text-gray-700">{s.holder_name}</td>
                      <td className="py-2 pr-4 text-right font-mono">{formatSharePct(s.total_holding_ratio)}</td>
                      <td className="py-2 text-gray-400 whitespace-nowrap">
                        {s.submit_date_time?.substring(0, 10)}
                        {" "}
                        <a href={getEdinetUrl(s.doc_id)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">↗</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    );
  } catch {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">← 戻る</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          企業データの取得に失敗しました。EDINETコードを確認してください。
        </div>
      </div>
    );
  }
}
