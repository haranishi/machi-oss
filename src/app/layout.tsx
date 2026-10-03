import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "街の通信簿 — 住む街をデータで選ぶ",
  description:
    "人口・地価・取引価格・ハザード・施設・気候を国の公開データでまとめ、引っ越し先の市区町村を“通信簿”で見比べる。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-stone-50">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-5 py-3">
            <Link href="/" className="text-sm font-bold tracking-wide text-stone-900">
              街の通信簿
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link href="/" className="text-stone-500 hover:text-stone-900">
                街をさがす
              </Link>
              <Link
                href="/compare"
                className="rounded-md bg-stone-900 px-3 py-1.5 font-semibold text-white hover:bg-stone-700"
              >
                くらべる
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
