import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SubTrack — 订阅管理看板",
  description: "个人订阅管理看板，追踪每一笔定期支出",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full dark antialiased">
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
