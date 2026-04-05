import {
  searchShareholders,
  formatSharePct,
  getEdinetUrl,
} from "@/lib/edinetdb";
import ShareholderSearchForm from "@/components/ShareholderSearchForm";
import { Suspense } from "react";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

async function Results({ q }: { q: string }) {
  const reports = await searchShareholders(q);

  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="text-3xl mb-2">---</div>
        該当なし
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span className="text-sm text-slate-600">
          「{q}」の大量保有報告:{" "}
          <span className="font-semibold text-slate-800">{reports.length}</span>{" "}
          件
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">発行会社</th>
              <th className="px-5 py-3 font-medium">保有者</th>
              <th className="px-5 py-3 text-right font-medium">保有割合</th>
              <th className="px-5 py-3 font-medium">目的</th>
              <th className="px-5 py-3 font-medium">報告日</th>
              <th className="px-5 py-3 font-medium">書類</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {reports.map((r, i) => (
              <tr key={i} className="hover:bg-blue-50/50">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/company/${r.issuer_edinet_code}`}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    {r.issuer_name}
                  </Link>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {r.issuer_sec_code}
                  </p>
                </td>
                <td className="px-5 py-3.5 text-slate-700">{r.holder_name}</td>
                <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-800">
                  {formatSharePct(r.total_holding_ratio)}
                </td>
                <td
                  className="px-5 py-3.5 text-xs text-slate-500 max-w-xs truncate"
                  title={r.purpose || ""}
                >
                  {r.purpose || "-"}
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                  {r.filing_trigger_date}
                </td>
                <td className="px-5 py-3.5">
                  <a
                    href={getEdinetUrl(r.doc_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                  >
                    EDINET
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function ShareholderSearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q || "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">株主名検索</h2>
        <p className="text-sm text-slate-500 mt-1">
          投資ファンド・事業会社などの保有銘柄を横断検索（大量保有報告書ベース）
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
        <Suspense>
          <ShareholderSearchForm defaultQ={q} />
        </Suspense>
      </div>

      {q && (
        <Suspense
          fallback={
            <div className="space-y-3">
              <div className="shimmer h-10 rounded-xl" />
              <div className="shimmer h-64 rounded-2xl" />
            </div>
          }
        >
          <Results q={q} />
        </Suspense>
      )}
    </div>
  );
}
