import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Industry Atlas",
  description: "全球 AI 全产业链研究图谱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
