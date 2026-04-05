import { Suspense } from "react";
import {
  searchCommunities,
  COMMUNITY_TYPES,
  type Community,
} from "@/lib/communities";
import { PREFECTURES } from "@/lib/gbiz";
import SimpleSearchForm from "@/components/SimpleSearchForm";
import PrefectureSelect from "@/components/PrefectureSelect";

interface Props {
  searchParams: Promise<{ q?: string; prefecture?: string }>;
}

const TYPE_COLORS: Record<string, string> = {
  経営者団体: "bg-blue-100 text-blue-700",
  業界団体: "bg-emerald-100 text-emerald-700",
  勉強会: "bg-purple-100 text-purple-700",
  投資家コミュニティ: "bg-amber-100 text-amber-700",
  士業ネットワーク: "bg-rose-100 text-rose-700",
  アカデミア: "bg-cyan-100 text-cyan-700",
};

function CommunityCard({ community }: { community: Community }) {
  const badgeColor =
    TYPE_COLORS[community.type] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="card-hover bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {community.url ? (
            <a
              href={community.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-800 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
            >
              <span>{community.name}</span>
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
            <p className="font-semibold text-slate-800">{community.name}</p>
          )}
        </div>
        <span
          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${badgeColor}`}
        >
          {community.type}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-500 line-clamp-3">
        {community.description}
      </p>

      {community.prefecture && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          {community.prefecture}
        </div>
      )}

      {community.focusAreas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {community.focusAreas.map((area) => (
            <span
              key={area}
              className="inline-block px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-600"
            >
              {area}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
        {community.memberCount != null && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            会員数: {community.memberCount.toLocaleString()}
          </span>
        )}
        {community.established != null && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            設立: {community.established}年
          </span>
        )}
      </div>
    </div>
  );
}

export default async function CommunitiesPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  const prefecture = params.prefecture;
  const communities = searchCommunities(q, prefecture);

  const grouped = new Map<string, Community[]>();
  for (const type of COMMUNITY_TYPES) {
    const items = communities.filter((c) => c.type === type);
    if (items.length > 0) {
      grouped.set(type, items);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">M&Aコミュニティ</h2>
        <p className="text-sm text-slate-500 mt-1">
          M&A・事業承継に関わる経営者団体・業界団体・勉強会・投資家コミュニティ
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-48">
            <Suspense>
              <SimpleSearchForm
                placeholder="例: 事業承継、ガバナンス、PE"
                action="/communities"
                paramName="q"
                buttonColor="blue"
                defaultValue={q || ""}
              />
            </Suspense>
          </div>
        </div>
        <Suspense>
          <PrefectureSelect
            prefectures={PREFECTURES}
            current={prefecture}
            basePath="/communities"
            extraParams={q ? { q } : undefined}
          />
        </Suspense>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">
            {communities.length}
          </span>{" "}
          コミュニティ
          {prefecture && (
            <span className="text-slate-400 ml-1">({prefecture})</span>
          )}
        </span>
      </div>

      {communities.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          該当するコミュニティが見つかりませんでした
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([type, items]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${TYPE_COLORS[type] ?? "bg-slate-100 text-slate-700"}`}
                >
                  {type}
                </span>
                <span className="text-xs text-slate-400">{items.length}件</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((community) => (
                  <CommunityCard key={community.id} community={community} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
