import { Suspense } from "react";
import type { MaAdvisor, MaAdvisorType } from "@/lib/ma-advisors";
import {
  search as searchMaAdvisors,
  getAllMaAdvisorServices,
  getAllMaAdvisorTargetSizes,
  getPresentMaAdvisorTypes,
} from "@/lib/d6e/repos/ma-advisors";
import { PREFECTURES } from "@/lib/gbiz";
import { normalizeCompanyLookupUrl } from "@/lib/company-lookup-url";
import SimpleSearchForm from "@/components/SimpleSearchForm";
import PrefectureSelect from "@/components/PrefectureSelect";
import ContactStatusSelect from "@/components/ContactStatusSelect";
import ContactStatusBadgeEditable from "@/components/ContactStatusBadgeEditable";
import type { AllianceContactStatus } from "@/lib/alliance-contact-status";
import { CONTACT_STATUS_LABELS } from "@/lib/alliance-contact-status";

interface Props {
  searchParams: Promise<{
    q?: string;
    type?: string;
    prefecture?: string;
    service?: string;
    listed?: string;
    targetSize?: string;
    contactStatus?: string;
  }>;
}

const TYPE_COLORS: Record<string, string> = {
  仲介会社: "bg-indigo-100 text-indigo-700",
  ブティック: "bg-purple-100 text-purple-700",
  総合系: "bg-blue-100 text-blue-700",
  クロスボーダー: "bg-cyan-100 text-cyan-700",
  地域特化: "bg-emerald-100 text-emerald-700",
};

async function TypeFilter({
  current,
  searchQ,
  prefecture,
  service,
  listed,
  targetSize,
  contactStatus,
}: {
  current?: string;
  searchQ?: string;
  prefecture?: string;
  service?: string;
  listed?: string;
  targetSize?: string;
  contactStatus?: string;
}) {
  const types = await getPresentMaAdvisorTypes();
  const buildHref = (type?: string) => {
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (type) params.set("type", type);
    if (prefecture) params.set("prefecture", prefecture);
    if (service) params.set("service", service);
    if (listed) params.set("listed", listed);
    if (targetSize) params.set("targetSize", targetSize);
    if (contactStatus) params.set("contactStatus", contactStatus);
    return `/ma-advisors?${params}`;
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={buildHref()}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!current ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
      >
        すべて
      </a>
      {types.map((t) => (
        <a
          key={t}
          href={buildHref(t)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${current === t ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
        >
          {t}
        </a>
      ))}
    </div>
  );
}

function AdvisorCard({ advisor }: { advisor: MaAdvisor }) {
  const badgeColor = TYPE_COLORS[advisor.type] ?? "bg-slate-100 text-slate-700";
  const link = advisor.url ? normalizeCompanyLookupUrl(advisor.url) : null;

  return (
    <div className="card-hover bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {link ? (
            <a
              href={link.href}
              {...(link.isInternal
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="font-semibold text-slate-800 hover:text-purple-600 transition-colors inline-flex items-center gap-1.5"
            >
              <span>{advisor.name}</span>
              <svg
                className="w-3.5 h-3.5 shrink-0 text-slate-400"
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
          ) : (
            <p className="font-semibold text-slate-800">{advisor.name}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ContactStatusBadgeEditable
            entityType="ma_advisor"
            entityId={advisor.id}
            initialStatus={advisor.contactStatus}
          />
          {advisor.listed && (
            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">
              上場
            </span>
          )}
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${badgeColor}`}
          >
            {advisor.type}
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-500 line-clamp-3">
        {advisor.description}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
        {advisor.prefecture && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            {advisor.prefecture}
          </span>
        )}
        {advisor.targetSize && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            対象: {advisor.targetSize}
          </span>
        )}
      </div>

      {advisor.services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {advisor.services.map((s) => (
            <span
              key={s}
              className="inline-block px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-600"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function MaAdvisorsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  const type = params.type as MaAdvisorType | undefined;
  const prefecture = params.prefecture;
  const service = params.service;
  const listed = params.listed === "1" ? "1" : undefined;
  const targetSize = params.targetSize;
  const contactStatus = params.contactStatus as
    | AllianceContactStatus
    | undefined;

  const [advisors, allServices, allTargetSizes] = await Promise.all([
    searchMaAdvisors({
      query: q,
      type,
      prefecture,
      service,
      listedOnly: listed === "1",
      targetSize,
      contactStatus,
    }),
    getAllMaAdvisorServices(),
    getAllMaAdvisorTargetSizes(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          M&A会社データベース
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          M&A仲介・FA・ブティックなど、M&Aアドバイザリーを提供する会社を検索
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <Suspense>
          <SimpleSearchForm
            placeholder="例: 事業承継、クロスボーダー、日本M&A"
            action="/ma-advisors"
            paramName="q"
            buttonColor="purple"
            defaultValue={q ?? ""}
          />
        </Suspense>
        <TypeFilter
          current={type}
          searchQ={q}
          prefecture={prefecture}
          service={service}
          listed={listed}
          targetSize={targetSize}
          contactStatus={contactStatus}
        />
        <Suspense>
          <PrefectureSelect
            prefectures={PREFECTURES}
            current={prefecture}
            basePath="/ma-advisors"
            extraParams={{
              ...(q ? { q } : {}),
              ...(type ? { type } : {}),
              ...(service ? { service } : {}),
              ...(listed ? { listed } : {}),
              ...(targetSize ? { targetSize } : {}),
              ...(contactStatus ? { contactStatus } : {}),
            }}
          />
        </Suspense>

        <form
          action="/ma-advisors"
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          {q && <input type="hidden" name="q" value={q} />}
          {type && <input type="hidden" name="type" value={type} />}
          {prefecture && (
            <input type="hidden" name="prefecture" value={prefecture} />
          )}

          <ContactStatusSelect current={contactStatus} />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">
              サービス
            </label>
            <select
              name="service"
              defaultValue={service || ""}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">すべて</option>
              {allServices.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">
              対象規模
            </label>
            <select
              name="targetSize"
              defaultValue={targetSize || ""}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">すべて</option>
              {allTargetSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 flex-1">
              <input
                type="checkbox"
                name="listed"
                value="1"
                defaultChecked={listed === "1"}
                className="rounded"
              />
              <span className="font-medium">上場のみ</span>
            </label>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap"
            >
              適用
            </button>
          </div>
        </form>

        {(service || listed || targetSize || contactStatus) && (
          <a
            href={`/ma-advisors${
              q || type || prefecture
                ? "?" +
                  new URLSearchParams({
                    ...(q ? { q } : {}),
                    ...(type ? { type } : {}),
                    ...(prefecture ? { prefecture } : {}),
                  }).toString()
                : ""
            }`}
            className="inline-block text-xs font-medium text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg"
          >
            詳細フィルターをクリア
          </a>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">
            {advisors.length}
          </span>{" "}
          件{type && <span className="text-slate-400 ml-1">({type})</span>}
          {prefecture && (
            <span className="text-slate-400 ml-1">/ {prefecture}</span>
          )}
          {service && <span className="text-slate-400 ml-1">/ {service}</span>}
          {targetSize && (
            <span className="text-slate-400 ml-1">/ {targetSize}</span>
          )}
          {listed && <span className="text-slate-400 ml-1">/ 上場のみ</span>}
          {contactStatus && (
            <span className="text-slate-400 ml-1">
              / {CONTACT_STATUS_LABELS[contactStatus]}
            </span>
          )}
        </span>
      </div>

      {advisors.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          該当するM&A会社が見つかりませんでした
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {advisors.map((a) => (
            <AdvisorCard key={a.id} advisor={a} />
          ))}
        </div>
      )}
    </div>
  );
}
