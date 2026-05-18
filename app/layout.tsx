import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2026 KAON 체육대회 만족도 조사",
  description: "2026 KAON Sports Day 만족도 설문",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
