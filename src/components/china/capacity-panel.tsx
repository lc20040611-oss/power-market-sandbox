"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { scenarioPresets } from "@/data/scenario-presets";
import { computeCapacityPayments } from "@/lib/capacity";
import { runMarketClearing } from "@/lib/market-clearing";
import { defaultRuleConfig } from "@/lib/rule-config";
import type { RuleConfig } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function CapacityPanel() {
  const baseInput = scenarioPresets[0].input;
  const scenarios: Array<{ name: string; config: RuleConfig }> = [
    { name: "无容量补偿", config: { ...defaultRuleConfig, enableCapacityPayment: false } },
    {
      name: "固定容量补偿",
      config: { ...defaultRuleConfig, enableCapacityPayment: true, capacityPaymentRate: 35 }
    },
    {
      name: "容量市场模拟",
      config: { ...defaultRuleConfig, enableCapacityPayment: true, capacityPaymentRate: 55 }
    }
  ];

  const comparison = useMemo(
    () =>
      scenarios.map((scenario) => {
        const result = runMarketClearing(baseInput, scenario.config);
        const capacityResults = computeCapacityPayments(result.participants);

        return {
          scenario: scenario.name,
          thermalRevenue: result.participants
            .filter((participant) => participant.type === "火电")
            .reduce((sum, participant) => sum + participant.revenue, 0),
          renewableRevenue: result.participants
            .filter((participant) => participant.type === "新能源")
            .reduce((sum, participant) => sum + participant.revenue, 0),
          customerCost: result.customerPurchaseCost,
          reliabilityIndex:
            capacityResults.reduce(
              (sum, item) => sum + item.availableCapacity * item.capacityAvailabilityRate,
              0
            ) / baseInput.loadDemand,
          capacityPaymentTotal: result.capacityPaymentTotal
        };
      }),
    [baseInput]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="容量机制下收益与成本变化">
          <BarChart data={comparison}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenario" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Bar dataKey="thermalRevenue" name="火电收益" fill="#38bdf8" radius={[8, 8, 0, 0]} />
            <Bar dataKey="renewableRevenue" name="新能源收益" fill="#34d399" radius={[8, 8, 0, 0]} />
            <Bar dataKey="customerCost" name="用户总成本" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="系统可靠性与容量补偿总额">
          <BarChart data={comparison}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenario" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Bar dataKey="reliabilityIndex" name="系统可靠性指标" fill="#818cf8" radius={[8, 8, 0, 0]} />
            <Bar dataKey="capacityPaymentTotal" name="容量补偿总额" fill="#22d3ee" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>容量机制场景摘要</CardTitle>
          <CardDescription>支持无容量补偿、固定容量补偿和容量市场模拟三种情景。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {comparison.map((item) => (
            <div key={item.scenario} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="font-medium text-white">{item.scenario}</p>
              <p className="mt-2 text-sm text-slate-300">火电收益 {item.thermalRevenue.toFixed(2)} 元</p>
              <p className="mt-1 text-sm text-slate-300">新能源收益 {item.renewableRevenue.toFixed(2)} 元</p>
              <p className="mt-1 text-sm text-slate-300">用户总成本 {item.customerCost.toFixed(2)} 元</p>
              <p className="mt-1 text-sm text-slate-300">系统可靠性 {item.reliabilityIndex.toFixed(2)}</p>
              <p className="mt-1 text-sm text-slate-300">容量补偿总额 {item.capacityPaymentTotal.toFixed(2)} 元</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
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
