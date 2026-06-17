"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { scenarioPresets } from "@/data/scenario-presets";
import { computeMarketPowerMetrics } from "@/lib/market-power";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function MarketPowerPanel() {
  const input = scenarioPresets[2].input;
  const metrics = useMemo(() => computeMarketPowerMetrics(input), [input]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="HHI" value={`${metrics.hhi}`} />
        <Metric label="CR3" value={`${(metrics.cr3 * 100).toFixed(2)}%`} />
        <Metric label="CR5" value={`${(metrics.cr5 * 100).toFixed(2)}%`} />
        <Metric label="RSI" value={`${metrics.rsi}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>市场力风险提示</CardTitle>
          <CardDescription>基于 HHI、CR3、CR5、RSI 和策略报价敏感性给出风险等级。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-lg font-semibold text-white">
            当前市场力风险等级：{metrics.riskLevel}
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">主体</th>
                  <th className="px-4 py-3 font-medium">市场份额</th>
                </tr>
              </thead>
              <tbody>
                {metrics.marketShares.map((item) => (
                  <tr key={item.participantId} className="border-t border-white/10 text-slate-300">
                    <td className="px-4 py-3">{item.participantName}</td>
                    <td className="px-4 py-3">{(item.marketShare * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="策略报价前后电价变化">
          <BarChart data={metrics.strategyScenarios}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenario" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Bar dataKey="clearingPrice" name="出清电价" fill="#38bdf8" radius={[8, 8, 0, 0]} />
            <Bar dataKey="deltaFromBaseline" name="相对基准变化" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="市场份额分布">
          <BarChart data={metrics.marketShares}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="participantName" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Bar dataKey="marketShare" fill="#22d3ee" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      </CardContent>
    </Card>
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
