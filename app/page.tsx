import Link from "next/link";

const CATEGORIES = [
  {
    group: "データベース",
    items: [
      {
        href: "/search",
        title: "企業検索",
        description: "EDINET DB APIで上場企業の財務データ・信用スコアを検索",
        source: "EDINET",
        color: "from-blue-500 to-blue-600",
      },
      {
        href: "/startups",
        title: "スタートアップ",
        description:
          "500万社以上の法人データから非上場企業・スタートアップを検索",
        source: "gBizINFO",
        color: "from-purple-500 to-purple-600",
      },
      {
        href: "/weekly",
        title: "株主名検索",
        description:
          "投資ファンド・事業会社の保有銘柄を横断検索（大量保有報告書）",
        source: "EDINET",
        color: "from-indigo-500 to-indigo-600",
      },
      {
        href: "/news",
        title: "M&A ニュース",
        description:
          "8カテゴリのRSSからM&A・買収・合併の最新ニュースを自動集約",
        source: "Google News",
        color: "from-amber-500 to-orange-500",
      },
    ],
  },
  {
    group: "ネットワーク",
    items: [
      {
        href: "/people",
        title: "人物DB",
        description:
          "M&A関連の著名人物・アドバイザー・投資家56名のデータベース",
        source: "厳選DB",
        color: "from-violet-500 to-purple-500",
      },
      {
        href: "/communities",
        title: "コミュニティ",
        description: "全国66の経営者コミュニティ・業界団体を網羅",
        source: "厳選DB",
        color: "from-pink-500 to-rose-500",
      },
    ],
  },
  {
    group: "専門家・金融機関",
    items: [
      {
        href: "/tax-advisors",
        title: "税理士・会計士",
        description: "M&A・事業承継に対応する税理士法人・会計事務所・FASを検索",
        source: "厳選DB",
        color: "from-teal-500 to-emerald-500",
      },
      {
        href: "/banks",
        title: "銀行・金融機関",
        description: "メガバンクから地銀・信金まで M&A 対応金融機関を網羅",
        source: "厳選DB",
        color: "from-sky-500 to-blue-500",
      },
    ],
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center py-6">
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">
          M&amp;A 総合データベース
        </h2>
        <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
          買手・売手情報からニュース、人物ネットワークまで M&amp;A
          に関する情報を一元管理。 法律・論文・セミナー等は右下の AI
          アシスタントに質問できます。
        </p>
      </div>

      {/* Category Groups */}
      {CATEGORIES.map((group) => (
        <section key={group.group}>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
            {group.group}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card-hover group relative bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
              >
                <div className={`h-1.5 bg-gradient-to-r ${item.color}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 shrink-0">
                      {item.source}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                  <div className="mt-3 flex items-center text-xs font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                    開く
                    <svg
                      className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
