import { Suspense } from "react";
import type { FinancialPlanner, FpType } from "@/lib/financial-planners";
import {
  search as searchFinancialPlanners,
  getAllFpServices,
  getAllFpTargetClients,
  getPresentFpTypes,
} from "@/lib/d6e/repos/financial-planners";
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
    targetClients?: string;
    contactStatus?: string;
  }>;
}

const TYPE_COLORS: Record<string, string> = {
  独立系FP: "bg-emerald-100 text-emerald-700",
  IFA: "bg-blue-100 text-blue-700",
  保険系FP: "bg-rose-100 text-rose-700",
  銀行系FP: "bg-indigo-100 text-indigo-700",
  ロボアド: "bg-cyan-100 text-cyan-700",
  FP事務所: "bg-amber-100 text-amber-700",
};

async function TypeFilter({
  current,
  searchQ,
  prefecture,
  service,
  listed,
  targetClients,
  contactStatus,
}: {
  current?: string;
  searchQ?: string;
  prefecture?: string;
  service?: string;
  listed?: string;
  targetClients?: string;
  contactStatus?: string;
}) {
  const types = await getPresentFpTypes();
  const buildHref = (type?: string) => {
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (type) params.set("type", type);
    if (prefecture) params.set("prefecture", prefecture);
    if (service) params.set("service", service);
    if (listed) params.set("listed", listed);
    if (targetClients) params.set("targetClients", targetClients);
    if (contactStatus) params.set("contactStatus", contactStatus);
    return `/financial-planners?${params}`;
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

function PlannerCard({ planner }: { planner: FinancialPlanner }) {
  const badgeColor = TYPE_COLORS[planner.type] ?? "bg-slate-100 text-slate-700";
  const link = planner.url ? normalizeCompanyLookupUrl(planner.url) : null;

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
              className="font-semibold text-slate-800 hover:text-emerald-600 transition-colors inline-flex items-center gap-1.5"
            >
              <span>{planner.name}</span>
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
            <p className="font-semibold text-slate-800">{planner.name}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ContactStatusBadgeEditable
            entityType="financial_planner"
            entityId={planner.id}
            initialStatus={planner.contactStatus}
          />
          {planner.listed && (
            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700">
              上場
            </span>
          )}
          <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${badgeColor}`}
          >
            {planner.type}
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-500 line-clamp-3">
        {planner.description}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
        {planner.prefecture && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            {planner.prefecture}
          </span>
        )}
        {planner.targetClients && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            対象: {planner.targetClients}
          </span>
        )}
      </div>

      {planner.services.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {planner.services.map((s) => (
            <span
              key={s}
              className="inline-block px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-600"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {planner.certifications && planner.certifications.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {planner.certifications.map((c) => (
            <span
              key={c}
              className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function FinancialPlannersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q;
  const type = sp.type as FpType | undefined;
  const prefecture = sp.prefecture;
  const service = sp.service;
  const listed = sp.listed === "1" ? "1" : undefined;
  const targetClients = sp.targetClients;
  const contactStatus = sp.contactStatus as AllianceContactStatus | undefined;

  const [planners, allServices, allTargetClients] = await Promise.all([
    searchFinancialPlanners({
      query: q,
      type,
      prefecture,
      service,
      listedOnly: listed === "1",
      targetClients,
      contactStatus,
    }),
    getAllFpServices(),
    getAllFpTargetClients(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Financial Planner データベース
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          独立系FP・IFA・PB・ロボアドバイザーなど、資産運用・相続・事業承継相談に対応するFPを検索
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <Suspense>
          <SimpleSearchForm
            placeholder="例: 資産運用、相続対策、富裕層、IFA"
            action="/financial-planners"
            paramName="q"
            buttonColor="green"
            defaultValue={q ?? ""}
          />
        </Suspense>
        <TypeFilter
          current={type}
          searchQ={q}
          prefecture={prefecture}
          service={service}
          listed={listed}
          targetClients={targetClients}
          contactStatus={contactStatus}
        />
        <Suspense>
          <PrefectureSelect
            prefectures={PREFECTURES}
            current={prefecture}
            basePath="/financial-planners"
            extraParams={{
              ...(q ? { q } : {}),
              ...(type ? { type } : {}),
              ...(service ? { service } : {}),
              ...(listed ? { listed } : {}),
              ...(targetClients ? { targetClients } : {}),
              ...(contactStatus ? { contactStatus } : {}),
            }}
          />
        </Suspense>

        <form
          action="/financial-planners"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
              対象顧客
            </label>
            <select
              name="targetClients"
              defaultValue={targetClients || ""}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">すべて</option>
              {allTargetClients.map((s) => (
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
              className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap"
            >
              適用
            </button>
          </div>
        </form>

        {(service || listed || targetClients || contactStatus) && (
          <a
            href={`/financial-planners${
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
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">
            {planners.length}
          </span>{" "}
          件{type && <span className="text-slate-400 ml-1">({type})</span>}
          {prefecture && (
            <span className="text-slate-400 ml-1">/ {prefecture}</span>
          )}
          {service && <span className="text-slate-400 ml-1">/ {service}</span>}
          {targetClients && (
            <span className="text-slate-400 ml-1">/ {targetClients}</span>
          )}
          {listed && <span className="text-slate-400 ml-1">/ 上場のみ</span>}
          {contactStatus && (
            <span className="text-slate-400 ml-1">
              / {CONTACT_STATUS_LABELS[contactStatus]}
            </span>
          )}
        </span>
      </div>

      {planners.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          該当するFPが見つかりませんでした
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {planners.map((p) => (
            <PlannerCard key={p.id} planner={p} />
          ))}
        </div>
      )}
    </div>
  );
}
