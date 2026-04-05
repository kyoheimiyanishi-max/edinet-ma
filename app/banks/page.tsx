import { Suspense } from "react";
import {
  searchBanks,
  getAllTypes,
  type Bank,
  type BankType,
} from "@/lib/banks";
import { PREFECTURES } from "@/lib/gbiz";
import SimpleSearchForm from "@/components/SimpleSearchForm";
import PrefectureSelect from "@/components/PrefectureSelect";

interface Props {
  searchParams: Promise<{ q?: string; type?: string; prefecture?: string }>;
}

const TYPE_COLORS: Record<string, string> = {
  メガバンク: "bg-blue-100 text-blue-700",
  地方銀行: "bg-emerald-100 text-emerald-700",
  信託銀行: "bg-cyan-100 text-cyan-700",
  政策金融: "bg-amber-100 text-amber-700",
  証券会社: "bg-purple-100 text-purple-700",
  投資銀行: "bg-red-100 text-red-700",
  ノンバンク: "bg-orange-100 text-orange-700",
  信用金庫: "bg-rose-100 text-rose-700",
};

function TypeFilter({
  current,
  searchQ,
  prefecture,
}: {
  current?: string;
  searchQ?: string;
  prefecture?: string;
}) {
  const types = getAllTypes();
  const buildHref = (type?: string) => {
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (type) params.set("type", type);
    if (prefecture) params.set("prefecture", prefecture);
    return `/banks?${params}`;
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

function BankCard({ bank }: { bank: Bank }) {
  const badgeColor = TYPE_COLORS[bank.type] ?? "bg-slate-100 text-slate-700";

  return (
    <div className="card-hover bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {bank.url ? (
            <a
              href={bank.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-800 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
            >
              <span>{bank.name}</span>
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
            <p className="font-semibold text-slate-800">{bank.name}</p>
          )}
        </div>
        <span
          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${badgeColor}`}
        >
          {bank.type}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-500 line-clamp-3">
        {bank.description}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
        {bank.prefecture && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            {bank.prefecture}
          </span>
        )}
        {bank.totalAssets && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            総資産: {bank.totalAssets}
          </span>
        )}
        {bank.maTeam && (
          <span className="inline-flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            {bank.maTeam}
          </span>
        )}
      </div>

      {bank.maServices.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {bank.maServices.map((s) => (
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

export default async function BanksPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  const type = params.type as BankType | undefined;
  const prefecture = params.prefecture;
  const banks = searchBanks(q, type, prefecture);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          銀行・金融機関データベース
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          M&Aアドバイザリー・事業承継融資に対応する銀行・証券・政策金融機関を検索
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
        <Suspense>
          <SimpleSearchForm
            placeholder="例: 三菱UFJ、事業承継、地方銀行"
            action="/banks"
            paramName="q"
            buttonColor="blue"
            defaultValue={q ?? ""}
          />
        </Suspense>
        <TypeFilter current={type} searchQ={q} prefecture={prefecture} />
        <Suspense>
          <PrefectureSelect
            prefectures={PREFECTURES}
            current={prefecture}
            basePath="/banks"
            extraParams={{ ...(q ? { q } : {}), ...(type ? { type } : {}) }}
          />
        </Suspense>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <span className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{banks.length}</span>{" "}
          件{type && <span className="text-slate-400 ml-1">({type})</span>}
          {prefecture && (
            <span className="text-slate-400 ml-1">/ {prefecture}</span>
          )}
        </span>
      </div>

      {banks.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="text-3xl mb-2">---</div>
          該当する金融機関が見つかりませんでした
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((b) => (
            <BankCard key={b.id} bank={b} />
          ))}
        </div>
      )}
    </div>
  );
}
