import { searchShareholders, formatSharePct, getEdinetUrl } from "@/lib/edinetdb";
import ShareholderSearchForm from "@/components/ShareholderSearchForm";
import { Suspense } from "react";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

async function Results({ q }: { q: string }) {
  const reports = await searchShareholders(q);

  if (reports.length === 0) {
    return <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-gray-200">該当なし</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
        「{q}」の大量保有報告: {reports.length} 件
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-4 py-3">発行会社</th>
              <th className="px-4 py-3">保有者</th>
              <th className="px-4 py-3 text-right">保有割合</th>
              <th className="px-4 py-3">目的</th>
              <th className="px-4 py-3">報告日</th>
              <th className="px-4 py-3">書類</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reports.map((r, i) => (
              <tr key={i} className="hover:bg-blue-50">
                <td className="px-4 py-3">
                  <Link href={`/company/${r.issuer_edinet_code}`} className="font-medium text-blue-700 hover:underline">
                    {r.issuer_name}
                  </Link>
                  <p className="text-xs text-gray-400">{r.issuer_sec_code}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{r.holder_name}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold">{formatSharePct(r.total_holding_ratio)}</td>
                <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={r.purpose || ""}>{r.purpose || "-"}</td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{r.filing_trigger_date}</td>
                <td className="px-4 py-3">
                  <a href={getEdinetUrl(r.doc_id)} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline whitespace-nowrap">EDINET ↗</a>
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
        <h2 className="text-xl font-bold text-gray-800">株主名検索</h2>
        <p className="text-sm text-gray-500 mt-1">
          投資ファンド・事業会社などの保有銘柄を横断検索（大量保有報告書ベース）
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <Suspense>
          <ShareholderSearchForm defaultQ={q} />
        </Suspense>
      </div>

      {q && (
        <Suspense fallback={<div className="text-center py-12 text-gray-400">検索中...</div>}>
          <Results q={q} />
        </Suspense>
      )}

      {!q && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          <strong>使い方:</strong> ファンド名や企業名で保有銘柄を検索できます。
          例: 「村上ファンド」「ブラックロック」「物言う株主」など M&amp;A 関連投資家を調査するのに活用できます。
        </div>
      )}
    </div>
  );
}
