import Link from "next/link";
import rules from "@/data/rules.json";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RuleCard } from "@/lib/types";

export default function RulesPage() {
  const ruleCards = rules as RuleCard[];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>规则库页面</Badge>
        <h2 className="text-3xl font-semibold text-white">市场规则模块</h2>
        <p className="max-w-3xl text-slate-300">
          按交易阶段与机制分类展示规则卡片，方便快速切换研究对象，并查看每类机制的核心参数。
        </p>
        <Link href="/rules/config">
          <Button className="mt-3">进入规则参数配置</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {ruleCards.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">{rule.category}</Badge>
                <CardTitle>{rule.title}</CardTitle>
              </div>
              <CardDescription>{rule.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-sm leading-6 text-slate-200">
                <span className="font-medium text-cyan-200">研究目标：</span>
                {rule.objective}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-white">规则参数</p>
                {rule.parameters.map((parameter) => (
                  <div key={parameter.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-400">{parameter.label}</p>
                      <p className="text-sm font-semibold text-white">{parameter.value}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{parameter.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
