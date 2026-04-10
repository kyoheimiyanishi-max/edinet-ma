import type { Metadata } from "next";
import { Geist } from "next/font/google";
import NavLink from "@/components/NavLink";
import ChatWidget from "@/components/ChatWidget";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EDINET M&A Browser",
  description: "M&Aに関するあらゆる情報を網羅するデータベース",
};

const NAV_ITEMS = [
  { href: "/", label: "ダッシュボード", exact: true },
  { href: "/search", label: "企業検索" },
  { href: "/shareholders", label: "株主名検索" },
  { href: "/deals", label: "売主管理" },
  { href: "/buyers", label: "買手開拓" },
  { href: "/outreach", label: "送付管理" },
  { href: "/time", label: "工数" },
  { href: "/events", label: "イベント" },
  { href: "/kpi", label: "KPI" },
  { href: "/news", label: "ニュース" },
  { href: "/people", label: "人物DB" },
  { href: "/communities", label: "コミュニティ" },
  { href: "/seminars", label: "セミナー" },
  { href: "/tax-advisors", label: "税理士・会計士" },
  { href: "/banks", label: "銀行・金融機関" },
  { href: "/ma-advisors", label: "M&A会社" },
  { href: "/financial-planners", label: "Financial Planner" },
  { href: "/settings", label: "設定" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 antialiased">
        <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm shadow-inner">
                <span className="text-xl font-bold">M</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  EDINET M&amp;A Browser
                </h1>
                <p className="text-xs text-blue-200 mt-0.5">
                  M&amp;A 総合データベース
                </p>
              </div>
            </div>
          </div>
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 pb-2">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.href} href={item.href} exact={item.exact}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              データ出典: 金融庁 EDINET / 経済産業省 gBizINFO / OpenAlex /
              Connpass
            </p>
            <p className="text-xs text-slate-300">Built with Next.js</p>
          </div>
        </footer>
        <ChatWidget />
      </body>
    </html>
  );
}
