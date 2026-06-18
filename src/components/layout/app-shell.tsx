import Link from "next/link";
import {
  BarChart3,
  BookOpenText,
  Compass,
  Cpu,
  DatabaseZap,
  Leaf,
  LineChart,
  Orbit,
  Shield,
  BatteryCharging,
  TrendingUp,
  FlaskConical,
  FileText
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Compass },
  { href: "/rules", label: "规则库", icon: BookOpenText },
  { href: "/roles", label: "角色选择", icon: Orbit },
  { href: "/simulation", label: "市场仿真", icon: Cpu },
  { href: "/analysis", label: "结果分析", icon: BarChart3 },
  { href: "/contracts", label: "合约结算", icon: DatabaseZap },
  { href: "/renewables", label: "新能源消纳", icon: Leaf },
  { href: "/storage", label: "储能参与", icon: BatteryCharging },
  { href: "/capacity", label: "容量机制", icon: Shield },
  { href: "/market-power", label: "市场力分析", icon: TrendingUp },
  { href: "/experiments", label: "实验管理", icon: FlaskConical },
  { href: "/paper-tools", label: "论文工具", icon: FileText }
];

export function AppShell({
  pathname,
  children
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.22),_transparent_24%)]" />
      <div className="absolute inset-0 bg-grid bg-[size:48px_48px] opacity-30" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Power Market Rule Sandbox</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">中国电力市场规则沙盒平台</h1>
              <p className="max-w-3xl text-sm text-slate-300">
                面向规则设计、机制评估与交易仿真的教学研究平台。当前版本已支持多时段出清、规则情景对比、组合实验与版本化结果存档。
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
              <LineChart className="h-5 w-5" />
              科技蓝渐变 · 教学仿真工作台
            </div>
          </div>
          <nav className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all",
                    isActive
                      ? "border-cyan-300/50 bg-cyan-400/15 text-white shadow-glow"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/30 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
