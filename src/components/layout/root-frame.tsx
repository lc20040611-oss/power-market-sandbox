"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";

export function RootFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return <AppShell pathname={pathname}>{children}</AppShell>;
}
