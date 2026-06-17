import Link from "next/link";
import { ArrowRight, BarChart3, BookOpenText, Cpu, Orbit, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    title: "规则库",
    href: "/rules",
    icon: BookOpenText,
    description: "梳理中长期、现货、辅助服务、容量与新能源消纳机制，支持参数查看。"
  },
  {
    title: "角色选择",
    href: "/roles",
    icon: Orbit,
    description: "展示火电、新能源、售电、用户、储能和监管者的目标函数与行为边界。"
  },
  {
    title: "市场仿真",
    href: "/simulation",
    icon: Cpu,
    description: "输入报价、电量、负荷、新能源预测、储能参数与偏差考核系数，执行简化出清。"
  },
  {
    title: "结果分析",
    href: "/analysis",
    icon: BarChart3,
    description: "用图表观察报价曲线、成交结果、主体收益与规则情景差异。"
  }
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <Badge>Dashboard</Badge>
            <CardTitle className="mt-3 text-4xl leading-tight">
              面向机制设计与交易仿真的
              <span className="block bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">
                电力市场研究工作台
              </span>
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              这个 MVP 适合做课堂演示、规则讨论和初步机制对比。当前版本使用本地 JSON 与单时段统一边际出清，后续可逐步演进到多时段、多约束和数据库版实验平台。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/simulation">
              <Button size="lg">
                进入市场仿真
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/rules">
              <Button size="lg" variant="outline">
                浏览规则库
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>研究定位</CardTitle>
            <CardDescription>聚焦规则沙盒、交易行为实验与教学可视化。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Feature title="规则参数化" description="把市场机制拆解为可调参数，快速比较规则改动影响。" icon={ShieldCheck} />
            <Feature title="角色行为研究" description="从不同市场主体视角观察报价策略与收益分配。" icon={Sparkles} />
            <Feature title="场景推演" description="用标准化输入和图表输出沉淀政策讨论的共同语言。" icon={BarChart3} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="h-full transition-transform hover:-translate-y-1">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function Feature({
  title,
  description,
  icon: Icon
}: {
  title: string;
  description: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
