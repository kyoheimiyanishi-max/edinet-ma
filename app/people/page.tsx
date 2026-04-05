import { Suspense } from "react";
import { MA_PEOPLE, searchPeople, CATEGORIES } from "@/lib/people";
import type { Person } from "@/lib/people";
import SimpleSearchForm from "@/components/SimpleSearchForm";

interface Props {
  searchParams: Promise<{ q?: string; category?: string }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  アドバイザー: "bg-blue-100 text-blue-700",
  投資家: "bg-emerald-100 text-emerald-700",
  経営者: "bg-amber-100 text-amber-700",
  アクティビスト: "bg-red-100 text-red-700",
  専門家: "bg-purple-100 text-purple-700",
};

function CategoryFilter({
  current,
  searchQ,
}: {
  current?: string;
  searchQ?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={searchQ ? `/people?q=${encodeURIComponent(searchQ)}` : "/people"}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          !current
            ? "bg-slate-800 text-white shadow-sm"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        }`}
      >
        すべて
      </a>
      {CATEGORIES.map((cat) => (
        <a
          key={cat}
          href={`/people?category=${encodeURIComponent(cat)}${searchQ ? `&q=${encodeURIComponent(searchQ)}` : ""}`}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            current === cat
              ? "bg-slate-800 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {cat}
        </a>
      ))}
    </div>
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
  const people = searchPeople(q, category);

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
        <CategoryFilter current={category} searchQ={q} />
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

      {!q && !category && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-6 text-sm text-amber-700">
          <p className="font-semibold mb-1">使い方</p>
          <p className="text-amber-600">
            名前・組織名・ディール名で検索するか、カテゴリで絞り込んでください。M&A業界のキーパーソンを一覧できます。
          </p>
        </div>
      )}
    </div>
  );
}
