import { Suspense } from "react";
import { screenerStartups, formatYenM, creditColor } from "@/lib/edinetdb";
import StartupFilters from "@/components/StartupFilters";
import Link from "next/link";

interface Props {
  searchParams: Promise<{
    revenue_max?: string;
    revenue_min?: string;
    rnd?: string;
    sort?: string;
  }>;
}

const SORT_OPTIONS = [
  { value: "rnd-expenses", label: "研究開発費（多い順）" },
  { value: "revenue", label: "売上高（大きい順）" },
];

const TAG_COLORS: Record<string, string> = {
  saas: "bg-blue-100 text-blue-700",
  ai: "bg-purple-100 text-purple-700",
  dx: "bg-indigo-100 text-indigo-700",
  fintech: "bg-green-100 text-green-700",
  cybersecurity: "bg-red-100 text-red-700",
  semiconductor: "bg-orange-100 text-orange-700",
  platform: "bg-cyan-100 text-cyan-700",
  iot: "bg-teal-100 text-teal-700",
  cloud: "bg-sky-100 text-sky-700",
  cleantech: "bg-emerald-100 text-emerald-700",
  esg: "bg-lime-100 text-lime-700",
  ev: "bg-yellow-100 text-yellow-700",
  d2c: "bg-pink-100 text-pink-700",
  b2b: "bg-slate-100 text-slate-600",
  consulting: "bg-gray-100 text-gray-600",
  media_content: "bg-rose-100 text-rose-700",
  ec_ecommerce: "bg-amber-100 text-amber-700",
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag] || "bg-gray-100 text-gray-600";
}

async function StartupList({
  revenueLte,
  revenueGte,
  rndGte,
  sortBy,
}: {
  revenueLte: number;
  revenueGte: number;
  rndGte: number;
  sortBy: string;
}) {
  const result = await screenerStartups({
    revenueLte,
    revenueGte: revenueGte > 0 ? revenueGte : undefined,
    rndGte: rndGte > 0 ? rndGte : undefined,
    sortBy,
    limit: 60,
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        該当企業: <span className="font-semibold text-gray-700">{result.total.toLocaleString()} 社</span>
        　表示: {result.showing} 件
      </p>

      {result.companies.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-lg border border-gray-200">
          該当企業なし。条件を変更してください。
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {result.companies.map((c) => {
            const rndRatio =
              c["rnd-expenses"] && c.revenue
                ? ((c["rnd-expenses"] / c.revenue) * 100).toFixed(1)
                : null;

            return (
              <Link
                key={c.edinetCode}
                href={`/company/${c.edinetCode}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 truncate">{c.filerName}</p>
                      {c.name_en && (
                        <p className="text-xs text-gray-400 truncate">{c.name_en}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {c.edinetCode}
                      {c.secCode && ` / ${c.secCode}`}
                      {" / "}
                      {c.industry}
                    </p>

                    {/* Tags */}
                    {c.business_tags && c.business_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.business_tags.map((tag) => (
                          <span
                            key={tag}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagColor(tag)}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="text-right text-sm shrink-0 space-y-1">
                    <div>
                      <span className="text-xs text-gray-400 block">売上高</span>
                      <span className="font-semibold text-gray-700">
                        {c.revenue != null ? formatYenM(c.revenue) : "-"}
                      </span>
                    </div>
                    {c["rnd-expenses"] != null && (
                      <div>
                        <span className="text-xs text-gray-400 block">研究開発費</span>
                        <span className="font-semibold text-purple-700">
                          {formatYenM(c["rnd-expenses"])}
                        </span>
                        {rndRatio && (
                          <span className="text-xs text-gray-400 block">
                            売上比 {rndRatio}%
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">{c.fiscalYear}年度</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function StartupsPage({ searchParams }: Props) {
  const params = await searchParams;
  const revenueLte = parseInt(params.revenue_max || "10000", 10);
  const revenueGte = parseInt(params.revenue_min || "0", 10);
  const rndGte = parseInt(params.rnd || "0", 10);
  const sortBy = params.sort || "rnd-expenses";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">スタートアップ・成長企業</h2>
        <p className="text-sm text-gray-500 mt-1">
          売上規模・研究開発費でフィルタリング。SaaS / AI / FinTech など成長セクターの企業を探せます。
        </p>
      </div>

      {/* Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700 flex gap-2 flex-wrap">
        <span>💡</span>
        <span>
          売上高100億円以下 + 研究開発費あり = スタートアップ・成長企業の目安。
          <strong>business_tags</strong>（saas / ai / fintech など）が付いた企業は特に注目。
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <Suspense>
          <StartupFilters
            defaultRevenueMax={String(revenueLte)}
            defaultRevenueMin={String(revenueGte)}
            defaultRnd={String(rndGte)}
            defaultSort={sortBy}
            sortOptions={SORT_OPTIONS}
          />
        </Suspense>
      </div>

      {/* Results */}
      <Suspense
        fallback={
          <div className="text-center py-16 text-gray-400 bg-white rounded-lg border border-gray-200">
            データを取得中...
          </div>
        }
      >
        <StartupList
          revenueLte={revenueLte}
          revenueGte={revenueGte}
          rndGte={rndGte}
          sortBy={sortBy}
        />
      </Suspense>
    </div>
  );
}
