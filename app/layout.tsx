import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EDINET M&A ブラウザ",
  description: "EDINETのM&A関連書類を閲覧するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-blue-700">
              📊 EDINET M&amp;A ブラウザ
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              EDINET DB API — 大量保有報告書・財務データで M&amp;A を分析
            </p>
          </div>
          <nav className="flex gap-2 mt-3">
            <Link
              href="/"
              className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              企業検索
            </Link>
            <Link
              href="/weekly"
              className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              株主名検索
            </Link>
          </nav>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white text-center text-xs text-gray-400 py-4">
          データ出典: 金融庁 EDINET (Electronic Disclosure for Investors NeTwork)
        </footer>
      </body>
    </html>
  );
}
