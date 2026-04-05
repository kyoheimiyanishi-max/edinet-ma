import {
  getCompany,
  getSubsidy,
  getPatent,
  getCertification,
  kindLabel,
  formatCapital,
  formatEstablished,
  yearsOld,
} from "@/lib/gbiz";
import Link from "next/link";

interface Props {
  params: Promise<{ corporate_number: string }>;
}

function InfoCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <div className="text-sm font-semibold mt-1 text-slate-800">
        {children}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        {badge && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            {badge}
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
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
        <Link
          href="/startups"
          className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
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
          スタートアップ一覧に戻る
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{c.name}</h2>
              {c.kana && (
                <p className="text-sm text-slate-400 mt-0.5">{c.kana}</p>
              )}
              {c.name_en && (
                <p className="text-sm text-slate-500">{c.name_en}</p>
              )}
              <p className="text-sm text-slate-500 mt-2">{c.location}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {age !== null && (
                <span
                  className={`px-3.5 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                    age <= 3
                      ? "bg-purple-100 text-purple-700"
                      : age <= 7
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {age <= 3 ? "創業期" : age <= 7 ? "成長期" : ""} 設立 {age} 年
                </span>
              )}
              <span className="text-sm text-slate-500">
                {kindLabel(c.kind)}
              </span>
            </div>
          </div>

          {c.business_summary && (
            <div className="mt-4 p-4 bg-slate-50/80 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed">
              {c.business_summary}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <InfoCard label="法人番号">
              <span className="font-mono">{c.corporate_number}</span>
            </InfoCard>
            <InfoCard label="設立年月日">
              {formatEstablished(c.date_of_establishment)}
            </InfoCard>
            <InfoCard label="資本金">{formatCapital(c.capital_stock)}</InfoCard>
            <InfoCard label="従業員数">
              {c.employee_number != null ? `${c.employee_number}人` : "-"}
            </InfoCard>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {c.representative_name && (
              <InfoCard label="代表者">{c.representative_name}</InfoCard>
            )}
            {c.company_url && (
              <InfoCard label="ウェブサイト">
                <a
                  href={
                    c.company_url.startsWith("http")
                      ? c.company_url
                      : `https://${c.company_url}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-normal truncate block transition-colors"
                >
                  {c.company_url}
                </a>
              </InfoCard>
            )}
            {(c.company_size_male != null || c.company_size_female != null) && (
              <InfoCard label="男女内訳">
                男: {c.company_size_male ?? "-"} / 女:{" "}
                {c.company_size_female ?? "-"}
              </InfoCard>
            )}
          </div>
        </div>

        {/* Subsidies */}
        <SectionCard title="補助金・助成金" badge={`${subsidies.length} 件`}>
          {subsidies.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              データなし
            </p>
          ) : (
            <div className="space-y-3">
              {(
                subsidies as ReturnType<
                  typeof Array<{
                    title?: string;
                    government_departments?: string;
                    amount?: number;
                    date_of_approval?: string;
                    note?: string;
                  }>
                >
              ).map((s, i) => (
                <div
                  key={i}
                  className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <p className="font-medium text-slate-800">{s.title || "-"}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
                    {s.government_departments && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        省庁: {s.government_departments}
                      </span>
                    )}
                    {s.amount != null && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        金額: {s.amount.toLocaleString()}円
                      </span>
                    )}
                    {s.date_of_approval && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        決定日: {s.date_of_approval}
                      </span>
                    )}
                  </div>
                  {s.note && (
                    <p className="text-xs text-slate-400 mt-1.5">{s.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Patents */}
        <SectionCard title="特許情報" badge={`${patents.length} 件`}>
          {patents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              データなし
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">タイトル</th>
                    <th className="pb-3 pr-4 font-medium">種別</th>
                    <th className="pb-3 pr-4 font-medium">出願番号</th>
                    <th className="pb-3 font-medium">出願日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(
                    patents as ReturnType<
                      typeof Array<{
                        title?: string;
                        patent_type?: string;
                        application_number?: string;
                        application_date?: string;
                      }>
                    >
                  ).map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="py-2.5 pr-4 text-slate-700">
                        {p.title || "-"}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {p.patent_type || "-"}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-500">
                        {p.application_number || "-"}
                      </td>
                      <td className="py-2.5 text-slate-500">
                        {p.application_date || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Certifications */}
        <SectionCard
          title="届出・認定情報"
          badge={`${certifications.length} 件`}
        >
          {certifications.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              データなし
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(certifications as Array<Record<string, string>>).map(
                (cert, i) => (
                  <div
                    key={i}
                    className="border border-slate-100 rounded-xl p-4 text-sm hover:bg-slate-50/50 transition-colors"
                  >
                    {Object.entries(cert)
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <p key={k} className="text-slate-600">
                          <span className="text-slate-400 text-xs">{k}: </span>
                          {String(v)}
                        </p>
                      ))}
                  </div>
                ),
              )}
            </div>
          )}
        </SectionCard>
      </div>
    );
  } catch {
    return (
      <div className="space-y-4">
        <Link
          href="/startups"
          className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
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
        <div className="bg-red-50 border border-red-200/60 rounded-2xl p-6 text-red-700 text-sm">
          企業情報の取得に失敗しました。法人番号: {corporate_number}
        </div>
      </div>
    );
  }
}
