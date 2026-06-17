"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { scenarioPresets } from "@/data/scenario-presets";
import { runMarketClearing } from "@/lib/market-clearing";
import { computeRenewableMetrics } from "@/lib/renewables";
import { ruleTemplates } from "@/lib/rule-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const renewableScenarioNames = ["新能源占比 20%", "新能源占比 40%", "新能源占比 60%", "新能源高波动场景"];

export function RenewablesPanel() {
  const renewableScenarios = scenarioPresets.filter((preset) => renewableScenarioNames.includes(preset.scenario));

  const comparisonData = useMemo(
    () =>
      renewableScenarios.map((scenario, index) => {
        const config = ruleTemplates[index % ruleTemplates.length].ruleConfig;
        const result = runMarketClearing(scenario.input, config);
        const metrics = computeRenewableMetrics(result.participants);

        return {
          scenario: scenario.scenario,
          consumptionRate: Number((metrics.consumptionRate * 100).toFixed(2)),
          curtailedOutput: metrics.totalCurtailedOutput,
          subsidyAmount: metrics.subsidyAmount,
          renewableRevenue: metrics.participantMetrics.reduce((sum, item) => sum + item.revenue, 0)
        };
      }),
    [renewableScenarios]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="不同规则下新能源消纳率对比">
          <BarChart data={comparisonData}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenario" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Bar dataKey="consumptionRate" fill="#34d399" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="不同规则下弃风弃光电量对比">
          <BarChart data={comparisonData}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenario" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Bar dataKey="curtailedOutput" fill="#f97316" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="新能源主体收益对比">
          <BarChart data={comparisonData}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenario" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Bar dataKey="renewableRevenue" name="新能源收益" fill="#38bdf8" radius={[8, 8, 0, 0]} />
            <Bar dataKey="subsidyAmount" name="补贴金额" fill="#818cf8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>新能源情景摘要</CardTitle>
            <CardDescription>分别对应 20%、40%、60% 渗透率和高波动场景。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {comparisonData.map((item) => (
              <div key={item.scenario} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="font-medium text-white">{item.scenario}</p>
                <p className="mt-2 text-sm text-slate-300">
                  消纳率 {item.consumptionRate}% ，弃风弃光 {item.curtailedOutput} MWh ，新能源收益 {item.renewableRevenue} 元
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-[360px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
