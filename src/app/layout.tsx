import type { Metadata } from "next";

import "@/app/globals.css";
import { RootFrame } from "@/components/layout/root-frame";

export const metadata: Metadata = {
  title: "中国电力市场规则沙盒平台",
  description: "面向电力市场规则、机制设计与交易仿真研究的教学原型。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <RootFrame>{children}</RootFrame>
      </body>
    </html>
  );
}
