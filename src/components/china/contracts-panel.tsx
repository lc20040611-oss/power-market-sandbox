"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { scenarioPresets } from "@/data/scenario-presets";
import { computeContractSettlements } from "@/lib/contracts";
import { runMarketClearing } from "@/lib/market-clearing";
import { defaultRuleConfig } from "@/lib/rule-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const contractScenarioNames = ["高中长期合约比例", "低中长期合约比例", "高现货暴露风险场景"];

export function ContractsPanel() {
  const contractScenarios = scenarioPresets.filter((preset) => contractScenarioNames.includes(preset.scenario));
  const [activeIndex, setActiveIndex] = useState(0);
  const activeScenario = contractScenarios[activeIndex] ?? scenarioPresets[0];

  const result = useMemo(
    () => runMarketClearing(activeScenario.input, defaultRuleConfig),
    [activeScenario]
  );
  const settlements = useMemo(() => computeContractSettlements(result.participants), [result.participants]);
  const coverageRate =
    settlements.reduce((sum, item) => sum + item.contractCoverageRate * item.actualQuantity, 0) /
    Math.max(1, settlements.reduce((sum, item) => sum + item.actualQuantity, 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {contractScenarios.map((scenario, index) => (
          <Button key={scenario.scenario} variant="outline" size="sm" onClick={() => setActiveIndex(index)}>
            {scenario.scenario}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="出清电价" value={`${result.clearingPrice} 元/MWh`} />
        <Metric label="合约覆盖率" value={`${(coverageRate * 100).toFixed(2)}%`} />
        <Metric
          label="现货偏差结算额"
          value={`${settlements.reduce((sum, item) => sum + item.spotSettlementAmount, 0).toFixed(2)} 元`}
        />
        <Metric
          label="总收益"
          value={`${settlements.reduce((sum, item) => sum + item.totalRevenue, 0).toFixed(2)} 元`}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>中长期合约与偏差结算</CardTitle>
            <Badge>{activeScenario.scenario}</Badge>
          </div>
          <CardDescription>展示合约电量、合约价格、现货偏差电量和偏差结算金额。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">主体</th>
                  <th className="px-4 py-3 font-medium">合约电量</th>
                  <th className="px-4 py-3 font-medium">合约价格</th>
                  <th className="px-4 py-3 font-medium">实际执行电量</th>
                  <th className="px-4 py-3 font-medium">现货偏差电量</th>
                  <th className="px-4 py-3 font-medium">合约收益</th>
                  <th className="px-4 py-3 font-medium">偏差结算金额</th>
                  <th className="px-4 py-3 font-medium">总收益</th>
                  <th className="px-4 py-3 font-medium">合约覆盖率</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((item) => (
                  <tr key={item.participantId} className="border-t border-white/10 text-slate-300">
                    <td className="px-4 py-3">{item.participantName}</td>
                    <td className="px-4 py-3">{item.contractQuantity}</td>
                    <td className="px-4 py-3">{item.contractPrice}</td>
                    <td className="px-4 py-3">{item.actualQuantity}</td>
                    <td className="px-4 py-3">{item.spotQuantity}</td>
                    <td className="px-4 py-3">{item.contractRevenue}</td>
                    <td className="px-4 py-3">{item.spotSettlementAmount}</td>
                    <td className="px-4 py-3">{item.totalRevenue}</td>
                    <td className="px-4 py-3">{(item.contractCoverageRate * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="h-[360px]">
        <CardHeader>
          <CardTitle>合约收益与现货偏差结算对比</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={settlements}>
              <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
              <XAxis dataKey="participantName" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip />
              <Legend />
              <Bar dataKey="contractRevenue" name="合约收益" fill="#38bdf8" radius={[8, 8, 0, 0]} />
              <Bar dataKey="spotSettlementAmount" name="现货偏差结算" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
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
