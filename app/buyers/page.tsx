import { Suspense } from "react";
import Link from "next/link";
import {
  search as searchCompanies,
  BUYER_PROSPECT_STATUSES,
  type BuyerProspectStatus,
} from "@/lib/d6e/repos/companies";
import BuyerProspectsTable from "@/components/BuyerProspectsTable";
import OutreachManager from "@/components/OutreachManager";
import { CATEGORIES } from "@/lib/people";
import type { Person } from "@/lib/people";
import {
  search as searchPeople,
  getAllOrganizations,
  getAllNotableDeals,
} from "@/lib/d6e/repos/people";
import { normalizeCompanyLookupUrl } from "@/lib/company-lookup-url";
import SimpleSearchForm from "@/components/SimpleSearchForm";

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    assignee?: string;
    strong?: string;
    tab?: string;
    category?: string;
    organization?: string;
    deal?: string;
    hasLinks?: string;
  }>;
}

const STATUS_COLORS: Record<BuyerProspectStatus, string> = {
  未接触: "bg-slate-100 text-slate-600",
  アプローチ中: "bg-blue-100 text-blue-700",
  日程調整中: "bg-cyan-100 text-cyan-700",
  アポfix: "bg-purple-100 text-purple-700",
  アポ調整中: "bg-indigo-100 text-indigo-700",
  アポ実施済: "bg-violet-100 text-violet-700",
  NDAやり取り中: "bg-amber-100 text-amber-700",
  NDA締結: "bg-amber-200 text-amber-800",
  開拓済: "bg-emerald-100 text-emerald-700",
  "開拓済（NDAなし）": "bg-emerald-100 text-emerald-600",
  "開拓済（NDA締結済み）": "bg-emerald-200 text-emerald-800",
  ペンディング: "bg-rose-100 text-rose-700",
};

export default async function BuyersPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab =
    params.tab === "outreach"
      ? "outreach"
      : params.tab === "people"
        ? "people"
        : "prospects";
  const q = params.q;
  const status = params.status as BuyerProspectStatus | undefined;
  const assignee = params.assignee;
  const strongOnly = params.strong === "1";

  if (tab === "outreach") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">買手管理</h2>
        </div>
        <BuyersTabs active="outreach" />
        <OutreachManager />
      </div>
    );
  }

  if (tab === "people") {
    return <PeopleTab params={params} />;
  }

  // 全買手プロスペクトを取得 (上限引き上げ)
  const all = await searchCompanies({
    isBuyer: true,
    ...(q ? { query: q } : {}),
    ...(status ? { buyerStatus: status } : {}),
    ...(assignee ? { buyerAssignedTo: assignee } : {}),
    ...(strongOnly ? { strongBuyer: true } : {}),
    limit: 5000,
  });

  // ファセット集計
  const statusCounts: Record<string, number> = {};
  const assigneeSet = new Set<string>();
  for (const c of all) {
    if (c.buyerStatus) {
      statusCounts[c.buyerStatus] = (statusCounts[c.buyerStatus] ?? 0) + 1;
    }
    if (c.buyerAssignedTo) assigneeSet.add(c.buyerAssignedTo);
  }
  const totalCount = all.length;
  const strongCount = all.filter((c) => c.strongBuyer).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">買手管理</h2>
        <p className="text-sm text-slate-500 mt-1">
          売主案件にマッチする買い手候補企業を一元管理。アプローチ状況・NDA・担当者で絞り込み可能
        </p>
      </div>

      <BuyersTabs active="prospects" />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="買手候補総数" value={totalCount} />
        <SummaryCard
          label="アプローチ中"
          value={statusCounts["アプローチ中"] ?? 0}
          color="text-blue-700"
        />
        <SummaryCard
          label="開拓済"
          value={
            (statusCounts["開拓済"] ?? 0) +
            (statusCounts["開拓済（NDA締結済み）"] ?? 0)
          }
          color="text-emerald-700"
        />
        <SummaryCard
          label="ストロングバイヤー"
          value={strongCount}
          color="text-rose-700"
        />
      </div>

      {/* Filters (form-based, server side) */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
        <form className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="会社名・URL で検索..."
            className="sm:col-span-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">開拓状況 全て</option>
            {BUYER_PROSPECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="assignee"
            defaultValue={assignee ?? ""}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">担当者 全て</option>
            {Array.from(assigneeSet)
              .sort()
              .map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 flex-1">
              <input
                type="checkbox"
                name="strong"
                value="1"
                defaultChecked={strongOnly}
                className="rounded"
              />
              ストロング
            </label>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
            >
              絞込
            </button>
          </div>
        </form>
        {(q || status || assignee || strongOnly) && (
          <div className="mt-3 text-xs text-slate-500">
            <span className="font-medium">{totalCount} 件</span>
            {" 該当 "}
            <a
              href="/buyers"
              className="ml-2 px-2 py-0.5 rounded text-rose-600 hover:bg-rose-50 font-medium"
            >
              フィルタクリア
            </a>
          </div>
        )}
      </div>

      {/* Table */}
      <Suspense fallback={<div className="text-slate-400">読み込み中...</div>}>
        <BuyerProspectsTable
          companies={all.map((c) => ({
            id: c.id,
            name: c.name,
            corporateNumber: c.corporateNumber ?? null,
            website: c.website ?? null,
            buyerStatus: c.buyerStatus ?? null,
            strongBuyer: c.strongBuyer,
            targetDeal: c.targetDeal ?? null,
            lastApproachDate: c.lastApproachDate ?? null,
            lastApproachMethod: c.lastApproachMethod ?? null,
            ndaDate: c.ndaDate ?? null,
            buyerAssignedTo: c.buyerAssignedTo ?? null,
            notes: c.notes ?? null,
          }))}
          statusColors={STATUS_COLORS}
        />
      </Suspense>
    </div>
  );
}

function BuyersTabs({
  active,
}: {
  active: "prospects" | "outreach" | "people";
}) {
  const tabs = [
    { key: "prospects", label: "買い手プロスペクト", href: "/buyers" },
    { key: "outreach", label: "送付管理", href: "/buyers?tab=outreach" },
    { key: "people", label: "人物DB", href: "/buyers?tab=people" },
  ] as const;
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === t.key
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = "text-blue-700",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4">
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ---- People tab ----

const PEOPLE_CATEGORY_COLORS: Record<string, string> = {
  アドバイザー: "bg-blue-100 text-blue-700",
  投資家: "bg-emerald-100 text-emerald-700",
  経営者: "bg-amber-100 text-amber-700",
  アクティビスト: "bg-red-100 text-red-700",
  専門家: "bg-purple-100 text-purple-700",
};

function buildPeopleUrl(
  current: {
    q?: string;
    category?: string;
    organization?: string;
    deal?: string;
    hasLinks?: string;
  },
  override: Partial<typeof current>,
): string {
  const merged = { ...current, ...override };
  const params = new URLSearchParams();
  params.set("tab", "people");
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.organization) params.set("organization", merged.organization);
  if (merged.deal) params.set("deal", merged.deal);
  if (merged.hasLinks) params.set("hasLinks", merged.hasLinks);
  return `/buyers?${params}`;
}

function PeopleFilterChip({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-slate-800 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </a>
  );
}

function PersonCard({ person }: { person: Person }) {
  const badgeColor =
    PEOPLE_CATEGORY_COLORS[person.category] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="card-hover bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-lg text-slate-800">{person.name}</p>
          {person.nameEn && (
            <p className="text-xs text-slate-400 mt-0.5">{person.nameEn}</p>
          )}
        </div>
        <span
          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${badgeColor}`}
        >
          {person.category}
        </span>
      </div>

      <div className="mt-2 space-y-1">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">{person.role}</span>
          <span className="text-slate-400 mx-1.5">|</span>
          {person.organization}
        </p>
      </div>

      <p className="mt-3 text-sm text-slate-500 line-clamp-3">
        {person.description}
      </p>

      {person.notableDeals && person.notableDeals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {person.notableDeals.map((deal) => (
            <span
              key={deal}
              className="inline-block px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-600"
            >
              {deal}
            </span>
          ))}
        </div>
      )}

      {person.links && person.links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {person.links.map((link) => {
            const normalized = normalizeCompanyLookupUrl(link.url);
            return (
              <a
                key={link.url}
                href={normalized.href}
                {...(normalized.isInternal
                  ? {}
                  : { target: "_blank", rel: "noopener noreferrer" })}
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
              >
                {link.label}
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
          })}
        </div>
      )}
    </div>
  );
}

async function PeopleTab({
  params,
}: {
  params: {
    q?: string;
    category?: string;
    organization?: string;
    deal?: string;
    hasLinks?: string;
  };
}) {
  const q = params.q;
  const category = params.category;
  const organization = params.organization;
  const deal = params.deal;
  const hasLinks = params.hasLinks === "1" ? "1" : undefined;

  const [people, allOrgs, allDeals] = await Promise.all([
    searchPeople({
      query: q,
      category,
      organization,
      deal,
      hasLinks: hasLinks === "1",
    }),
    getAllOrganizations(),
    getAllNotableDeals(),
  ]);
  const current = { q, category, organization, deal, hasLinks };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">買手管理</h2>
        <p className="text-sm text-slate-500 mt-1">
          M&A業界の主要プレイヤー --
          アドバイザー・投資家・経営者・アクティビスト・専門家
        </p>
      </div>

      <BuyersTabs active="people" />

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <Suspense>
          <SimpleSearchForm
            placeholder="例: 村上、ソフトバンク、東芝"
            action="/buyers"
            paramName="q"
            buttonColor="orange"
            defaultValue={q || ""}
          />
        </Suspense>

        {/* Category */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">カテゴリ</div>
          <div className="flex flex-wrap gap-2">
            <PeopleFilterChip
              active={!category}
              href={buildPeopleUrl(current, { category: undefined })}
            >
              すべて
            </PeopleFilterChip>
            {CATEGORIES.map((cat) => (
              <PeopleFilterChip
                key={cat}
                active={category === cat}
                href={buildPeopleUrl(current, { category: cat })}
              >
                {cat}
              </PeopleFilterChip>
            ))}
          </div>
        </div>

        {/* Organization + Notable deal */}
        <form
          action="/buyers"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <input type="hidden" name="tab" value="people" />
          {q && <input type="hidden" name="q" value={q} />}
          {category && <input type="hidden" name="category" value={category} />}
          {hasLinks && <input type="hidden" name="hasLinks" value={hasLinks} />}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">
              所属組織
            </label>
            <select
              name="organization"
              defaultValue={organization || ""}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">すべての組織</option>
              {allOrgs.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">
              関連案件
            </label>
            <select
              name="deal"
              defaultValue={deal || ""}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">すべての案件</option>
              {allDeals.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
            >
              絞り込み適用
            </button>
          </div>
        </form>

        {/* Has links toggle */}
        <div className="flex items-center gap-2">
          <PeopleFilterChip
            active={hasLinks === "1"}
            href={buildPeopleUrl(current, {
              hasLinks: hasLinks === "1" ? undefined : "1",
            })}
          >
            外部リンクあり
          </PeopleFilterChip>
          {(category || organization || deal || hasLinks) && (
            <a
              href={buildPeopleUrl({}, { q })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-all"
            >
              フィルターをクリア
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{people.length}</span>{" "}
          人
          {category && (
            <span className="text-slate-400 ml-1">({category})</span>
          )}
        </span>
      </div>

      {people.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          該当する人物が見つかりませんでした
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}
