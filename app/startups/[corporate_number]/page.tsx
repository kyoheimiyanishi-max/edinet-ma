import {
  getCompany, getSubsidy, getPatent, getCertification,
  kindLabel, formatCapital, formatEstablished, yearsOld,
} from "@/lib/gbiz";
import Link from "next/link";

interface Props {
  params: Promise<{ corporate_number: string }>;
}

export default async function StartupDetailPage({ params }: Props) {
  const { corporate_number } = await params;

  try {
    const [compRes, subsidyRes, patentRes, certRes] = await Promise.all([
      getCompany(corporate_number),
      getSubsidy(corporate_number),
      getPatent(corporate_number),
      getCertification(corporate_number),
    ]);

    const c = compRes["hojin-infos"]?.[0];
    if (!c) throw new Error("not found");

    const subsidies = subsidyRes["hojin-infos"]?.[0]?.subsidy || [];
    const patents = patentRes["hojin-infos"]?.[0]?.patent || [];
    const certifications = certRes["hojin-infos"]?.[0]?.certification || [];
    const age = yearsOld(c.date_of_establishment);

    return (
      <div className="space-y-6">
        <Link href="/startups" className="text-sm text-purple-600 hover:underline">
          ← スタートアップ一覧に戻る
        </Link>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{c.name}</h2>
              {c.kana && <p className="text-sm text-gray-400 mt-0.5">{c.kana}</p>}
              {c.name_en && <p className="text-sm text-gray-500">{c.name_en}</p>}
              <p className="text-sm text-gray-500 mt-2">{c.location}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {age !== null && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  age <= 3 ? "bg-purple-100 text-purple-700" :
                  age <= 7 ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {age <= 3 ? "🔥 創業期" : age <= 7 ? "🌱 成長期" : ""}
                  　設立 {age} 年
                </span>
              )}
              <span className="text-sm text-gray-500">{kindLabel(c.kind)}</span>
            </div>
          </div>

          {c.business_summary && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
              {c.business_summary}
            </div>
          )}

          {/* Key info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">法人番号</p>
              <p className="font-mono text-sm font-semibold mt-0.5">{c.corporate_number}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">設立年月日</p>
              <p className="text-sm font-semibold mt-0.5">{formatEstablished(c.date_of_establishment)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">資本金</p>
              <p className="text-sm font-semibold mt-0.5">{formatCapital(c.capital_stock)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">従業員数</p>
              <p className="text-sm font-semibold mt-0.5">
                {c.employee_number != null ? `${c.employee_number}人` : "-"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {c.representative_name && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">代表者</p>
                <p className="text-sm font-semibold mt-0.5">{c.representative_name}</p>
              </div>
            )}
            {c.company_url && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">ウェブサイト</p>
                <a
                  href={c.company_url.startsWith("http") ? c.company_url : `https://${c.company_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-0.5 block truncate"
                >
                  {c.company_url}
                </a>
              </div>
            )}
            {(c.company_size_male != null || c.company_size_female != null) && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400">男女内訳</p>
                <p className="text-sm font-semibold mt-0.5">
                  男: {c.company_size_male ?? "-"} / 女: {c.company_size_female ?? "-"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Subsidies */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">
            補助金・助成金
            <span className="ml-2 text-sm font-normal text-gray-400">{subsidies.length} 件</span>
          </h3>
          {subsidies.length === 0 ? (
            <p className="text-sm text-gray-400">データなし</p>
          ) : (
            <div className="space-y-3">
              {(subsidies as ReturnType<typeof Array<{
                title?: string; government_departments?: string;
                amount?: number; date_of_approval?: string; note?: string;
              }>>).map((s, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <p className="font-medium text-gray-800">{s.title || "-"}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    {s.government_departments && <span>省庁: {s.government_departments}</span>}
                    {s.amount != null && <span>金額: {s.amount.toLocaleString()}円</span>}
                    {s.date_of_approval && <span>決定日: {s.date_of_approval}</span>}
                  </div>
                  {s.note && <p className="text-xs text-gray-400 mt-1">{s.note}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Patents */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">
            特許情報
            <span className="ml-2 text-sm font-normal text-gray-400">{patents.length} 件</span>
          </h3>
          {patents.length === 0 ? (
            <p className="text-sm text-gray-400">データなし</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="pb-2 pr-4">タイトル</th>
                    <th className="pb-2 pr-4">種別</th>
                    <th className="pb-2 pr-4">出願番号</th>
                    <th className="pb-2">出願日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(patents as ReturnType<typeof Array<{
                    title?: string; patent_type?: string;
                    application_number?: string; application_date?: string;
                  }>>).map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2 pr-4">{p.title || "-"}</td>
                      <td className="py-2 pr-4 text-gray-500">{p.patent_type || "-"}</td>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-500">{p.application_number || "-"}</td>
                      <td className="py-2 text-gray-500">{p.application_date || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Certifications */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">
            届出・認定情報
            <span className="ml-2 text-sm font-normal text-gray-400">{certifications.length} 件</span>
          </h3>
          {certifications.length === 0 ? (
            <p className="text-sm text-gray-400">データなし</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(certifications as Array<Record<string, string>>).map((cert, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3 text-sm">
                  {Object.entries(cert).filter(([, v]) => v).map(([k, v]) => (
                    <p key={k} className="text-gray-600">
                      <span className="text-gray-400 text-xs">{k}: </span>{String(v)}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  } catch {
    return (
      <div className="space-y-4">
        <Link href="/startups" className="text-sm text-purple-600 hover:underline">← 戻る</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          企業情報の取得に失敗しました。法人番号: {corporate_number}
        </div>
      </div>
    );
  }
}
