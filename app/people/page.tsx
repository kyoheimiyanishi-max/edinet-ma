import { Suspense } from "react";
import {
  searchPeople,
  CATEGORIES,
  getAllOrganizations,
  getAllNotableDeals,
} from "@/lib/people";
import type { Person } from "@/lib/people";
import SimpleSearchForm from "@/components/SimpleSearchForm";

interface Props {
  searchParams: Promise<{
    q?: string;
    category?: string;
    organization?: string;
    deal?: string;
    hasLinks?: string;
  }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  アドバイザー: "bg-blue-100 text-blue-700",
  投資家: "bg-emerald-100 text-emerald-700",
  経営者: "bg-amber-100 text-amber-700",
  アクティビスト: "bg-red-100 text-red-700",
  専門家: "bg-purple-100 text-purple-700",
};

function buildUrl(
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
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.organization) params.set("organization", merged.organization);
  if (merged.deal) params.set("deal", merged.deal);
  if (merged.hasLinks) params.set("hasLinks", merged.hasLinks);
  const qs = params.toString();
  return qs ? `/people?${qs}` : "/people";
}

function FilterChip({
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
    CATEGORY_COLORS[person.category] ?? "bg-slate-100 text-slate-700";

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
          {person.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
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
          ))}
        </div>
      )}
    </div>
  );
}

export default async function PeoplePage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  const category = params.category;
  const organization = params.organization;
  const deal = params.deal;
  const hasLinks = params.hasLinks === "1" ? "1" : undefined;

  const people = searchPeople({
    query: q,
    category,
    organization,
    deal,
    hasLinks: hasLinks === "1",
  });

  const allOrgs = getAllOrganizations();
  const allDeals = getAllNotableDeals();
  const current = { q, category, organization, deal, hasLinks };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          M&A人物データベース
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          M&A業界の主要プレイヤー --
          アドバイザー・投資家・経営者・アクティビスト・専門家
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <Suspense>
          <SimpleSearchForm
            placeholder="例: 村上、ソフトバンク、東芝"
            action="/people"
            paramName="q"
            buttonColor="orange"
            defaultValue={q || ""}
          />
        </Suspense>

        {/* Category */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">カテゴリ</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={!category}
              href={buildUrl(current, { category: undefined })}
            >
              すべて
            </FilterChip>
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                active={category === cat}
                href={buildUrl(current, { category: cat })}
              >
                {cat}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Organization + Notable deal: shared form so both apply on submit */}
        <form
          action="/people"
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
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
          <FilterChip
            active={hasLinks === "1"}
            href={buildUrl(current, {
              hasLinks: hasLinks === "1" ? undefined : "1",
            })}
          >
            🔗 外部リンクあり
          </FilterChip>
          {(category || organization || deal || hasLinks) && (
            <a
              href={buildUrl({}, { q })}
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
