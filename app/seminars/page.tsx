import { Suspense } from "react";
import {
  formatEventDate,
  formatCapacity,
  isUpcoming,
  eventTypeLabel,
  getSeminarCategoryColor,
  SEMINAR_TAGS,
  type SeminarEvent,
} from "@/lib/seminars";
import { search as searchSeminars } from "@/lib/d6e/repos/seminars";
import SimpleSearchForm from "@/components/SimpleSearchForm";

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    format?: string;
    category?: string;
    availability?: string;
    owner?: string;
    /** カンマ区切りタグ。複数指定で OR マッチ。 */
    tags?: string;
    /** "all" 指定で AND マッチ。 */
    tagMode?: string;
  }>;
}

type SeminarStatus = "all" | "upcoming" | "past";
type SeminarFormat = "all" | "online" | "offline";
type SeminarAvailability = "all" | "available";

function isOnlineEvent(s: SeminarEvent): boolean {
  const text = `${s.place ?? ""} ${s.address ?? ""}`.toLowerCase();
  return (
    !s.place ||
    text.includes("online") ||
    text.includes("オンライン") ||
    text.includes("zoom") ||
    text.includes("配信") ||
    text.includes("リモート") ||
    text.includes("ウェビナー")
  );
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

function SeminarCard({ seminar }: { seminar: SeminarEvent }) {
  const upcoming = isUpcoming(seminar.started_at);
  const badgeColor = getSeminarCategoryColor(seminar.category);

  return (
    <div className="card-hover bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <a
            href={seminar.event_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-800 hover:text-blue-600 transition-colors inline-flex items-start gap-1.5"
          >
            <span className="line-clamp-2">{seminar.title}</span>
            <svg
              className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-1"
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
        </div>
        <span
          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${badgeColor}`}
        >
          {seminar.category}
        </span>
      </div>

      {seminar.catch && (
        <p className="mt-2 text-sm text-slate-600 line-clamp-2">
          {seminar.catch}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
            upcoming
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              upcoming ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {upcoming ? "開催予定" : "終了"}
        </span>
        <span className="text-slate-500">
          {formatEventDate(seminar.started_at)}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
        {seminar.place && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            {seminar.place}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          {formatCapacity(seminar.accepted, seminar.limit)}
        </span>
        {seminar.event_type && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            {eventTypeLabel(seminar.event_type)}
          </span>
        )}
        {seminar.owner_display_name && (
          <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            主催: {seminar.owner_display_name}
          </span>
        )}
      </div>

      {seminar.tags && seminar.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {seminar.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block px-1.5 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600 font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function SeminarsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  const status: SeminarStatus =
    params.status === "upcoming"
      ? "upcoming"
      : params.status === "past"
        ? "past"
        : "all";
  const format: SeminarFormat =
    params.format === "online"
      ? "online"
      : params.format === "offline"
        ? "offline"
        : "all";
  const category = params.category;
  const availability: SeminarAvailability =
    params.availability === "available" ? "available" : "all";
  const owner = params.owner;
  const selectedTags = (params.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const tagMode: "any" | "all" = params.tagMode === "all" ? "all" : "any";

  const allSeminars = await searchSeminars({
    query: q,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    matchAllTags: tagMode === "all",
  });

  // Apply filters
  let filtered = allSeminars;
  if (status === "upcoming")
    filtered = filtered.filter((s) => isUpcoming(s.started_at));
  if (status === "past")
    filtered = filtered.filter((s) => !isUpcoming(s.started_at));
  if (format === "online") filtered = filtered.filter(isOnlineEvent);
  if (format === "offline")
    filtered = filtered.filter((s) => !isOnlineEvent(s));
  if (category) filtered = filtered.filter((s) => s.category === category);
  if (availability === "available")
    filtered = filtered.filter((s) => s.limit == null || s.accepted < s.limit);
  if (owner) {
    const o = owner.toLowerCase();
    filtered = filtered.filter((s) =>
      s.owner_display_name.toLowerCase().includes(o),
    );
  }

  const seminars = filtered;
  const upcoming = seminars.filter((s) => isUpcoming(s.started_at));
  const past = seminars.filter((s) => !isUpcoming(s.started_at));

  // Available facets (calculated from full list to keep options stable)
  const allCategories = Array.from(
    new Set(allSeminars.map((s) => s.category)),
  ).sort();
  const allOwners = Array.from(
    new Set(
      allSeminars
        .map((s) => s.owner_display_name)
        .filter((o): o is string => Boolean(o)),
    ),
  ).sort();

  const buildHref = (override: Partial<typeof params>) => {
    const merged = {
      q,
      status: status === "all" ? undefined : status,
      format: format === "all" ? undefined : format,
      category,
      availability: availability === "all" ? undefined : availability,
      owner,
      tags: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
      tagMode: tagMode === "all" ? "all" : undefined,
      ...override,
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v) sp.set(k, String(v));
    }
    const qs = sp.toString();
    return qs ? `/seminars?${qs}` : "/seminars";
  };

  const buildTagToggleHref = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    return buildHref({ tags: next.length > 0 ? next.join(",") : undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">M&Aセミナー情報</h2>
        <p className="text-sm text-slate-500 mt-1">
          M&A・事業承継・PMI・バリュエーションなどに関するセミナー・勉強会（Connpass
          連携）
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <Suspense>
          <SimpleSearchForm
            placeholder="例: 事業承継、PMI、デューデリジェンス"
            action="/seminars"
            paramName="q"
            buttonColor="blue"
            defaultValue={q || ""}
          />
        </Suspense>

        {/* Status */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">開催状況</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={status === "all"}
              href={buildHref({ status: undefined })}
            >
              すべて
            </FilterChip>
            <FilterChip
              active={status === "upcoming"}
              href={buildHref({ status: "upcoming" })}
            >
              開催予定
            </FilterChip>
            <FilterChip
              active={status === "past"}
              href={buildHref({ status: "past" })}
            >
              終了
            </FilterChip>
          </div>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-500">開催形式</div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={format === "all"}
              href={buildHref({ format: undefined })}
            >
              すべて
            </FilterChip>
            <FilterChip
              active={format === "online"}
              href={buildHref({ format: "online" })}
            >
              オンライン
            </FilterChip>
            <FilterChip
              active={format === "offline"}
              href={buildHref({ format: "offline" })}
            >
              オフライン
            </FilterChip>
          </div>
        </div>

        {/* Tags (内容ベース) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500">
              内容タグ
              {selectedTags.length > 0 && (
                <span className="ml-2 text-slate-400">
                  {selectedTags.length}件選択中 (
                  {tagMode === "all" ? "すべて含む" : "いずれか含む"})
                </span>
              )}
            </div>
            {selectedTags.length >= 2 && (
              <a
                href={buildHref({
                  tagMode: tagMode === "all" ? undefined : "all",
                })}
                className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
              >
                {tagMode === "all" ? "→ いずれか" : "→ すべて"}
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={selectedTags.length === 0}
              href={buildHref({ tags: undefined, tagMode: undefined })}
            >
              すべて
            </FilterChip>
            {SEMINAR_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <FilterChip
                  key={tag}
                  active={active}
                  href={buildTagToggleHref(tag)}
                >
                  {active ? "✓ " : ""}
                  {tag}
                </FilterChip>
              );
            })}
          </div>
        </div>

        {/* Category */}
        {allCategories.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500">カテゴリ</div>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={!category}
                href={buildHref({ category: undefined })}
              >
                すべて
              </FilterChip>
              {allCategories.map((c) => (
                <FilterChip
                  key={c}
                  active={category === c}
                  href={buildHref({ category: c })}
                >
                  {c}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        {/* Availability + owner */}
        <div className="flex flex-wrap items-end gap-3">
          <FilterChip
            active={availability === "available"}
            href={buildHref({
              availability:
                availability === "available" ? undefined : "available",
            })}
          >
            🎟 残席あり
          </FilterChip>

          <form
            action="/seminars"
            className="flex items-center gap-2 flex-1 min-w-[240px]"
          >
            {q && <input type="hidden" name="q" value={q} />}
            {status !== "all" && (
              <input type="hidden" name="status" value={status} />
            )}
            {format !== "all" && (
              <input type="hidden" name="format" value={format} />
            )}
            {category && (
              <input type="hidden" name="category" value={category} />
            )}
            {availability === "available" && (
              <input type="hidden" name="availability" value="available" />
            )}
            {selectedTags.length > 0 && (
              <input type="hidden" name="tags" value={selectedTags.join(",")} />
            )}
            {tagMode === "all" && (
              <input type="hidden" name="tagMode" value="all" />
            )}
            <select
              name="owner"
              defaultValue={owner || ""}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">すべての主催者</option>
              {allOwners.slice(0, 100).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
            >
              適用
            </button>
          </form>

          {(status !== "all" ||
            format !== "all" ||
            category ||
            availability === "available" ||
            owner ||
            selectedTags.length > 0) && (
            <a
              href={buildHref({
                status: undefined,
                format: undefined,
                category: undefined,
                availability: undefined,
                owner: undefined,
                tags: undefined,
                tagMode: undefined,
              })}
              className="text-xs font-medium text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg"
            >
              フィルタークリア
            </a>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">
            {seminars.length}
          </span>{" "}
          件
          <span className="text-slate-400 ml-2">
            (開催予定 {upcoming.length} / 終了 {past.length}
            {seminars.length !== allSeminars.length &&
              ` / 元 ${allSeminars.length} 件`}
            )
          </span>
        </span>
      </div>

      {seminars.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          該当するセミナーが見つかりませんでした
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                  開催予定
                </span>
                <span className="text-xs text-slate-400">
                  {upcoming.length}件
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcoming.map((seminar) => (
                  <SeminarCard key={seminar.event_id} seminar={seminar} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                  過去のイベント
                </span>
                <span className="text-xs text-slate-400">{past.length}件</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {past.map((seminar) => (
                  <SeminarCard key={seminar.event_id} seminar={seminar} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
