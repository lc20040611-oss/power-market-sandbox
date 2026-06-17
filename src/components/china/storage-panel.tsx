"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { scenarioPresets } from "@/data/scenario-presets";
import { simulateStorageOperation } from "@/lib/storage";
import type { StorageAsset } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const priceCurve = [180, 170, 165, 190, 260, 320, 410, 450];
const loadCurve = [420, 400, 390, 430, 500, 540, 580, 560];

export function StoragePanel() {
  const storageScenarios = scenarioPresets.filter((preset) => preset.input.participants.some((item) => item.type === "储能"));
  const [activeIndex, setActiveIndex] = useState(0);
  const activeScenario = storageScenarios[activeIndex] ?? scenarioPresets[0];
  const storageParticipant = activeScenario.input.participants.find((item) => item.type === "储能");

  const asset: StorageAsset | null = storageParticipant
    ? {
        participantId: storageParticipant.id,
        participantName: storageParticipant.name,
        storageCapacity: storageParticipant.storageCapacity ?? 120,
        chargePower: storageParticipant.chargePower ?? 45,
        dischargePower: storageParticipant.dischargePower ?? 45,
        roundTripEfficiency: storageParticipant.roundTripEfficiency ?? 0.9,
        initialSoc: storageParticipant.initialSoc ?? 0.5,
        minSoc: storageParticipant.minSoc ?? 0.15,
        maxSoc: storageParticipant.maxSoc ?? 0.95
      }
    : null;

  const result = useMemo(
    () => (asset ? simulateStorageOperation(asset, priceCurve, loadCurve) : null),
    [asset]
  );

  if (!result) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {storageScenarios.slice(0, 4).map((scenario, index) => (
          <Button key={scenario.scenario} variant="outline" size="sm" onClick={() => setActiveIndex(index)}>
            {scenario.scenario}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="充电成本" value={`${result.chargeCost} 元`} />
        <Metric label="放电收益" value={`${result.dischargeRevenue} 元`} />
        <Metric label="净套利收益" value={`${result.netArbitrageRevenue} 元`} />
        <Metric label="等效循环次数" value={`${result.equivalentCycles}`} />
        <Metric label="SOC 变化" value={`${result.socChange}`} />
        <Metric label="峰值负荷削减量" value={`${result.peakLoadReduction} MW`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard title="储能 SOC 曲线">
          <LineChart data={result.socSeries}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="hour" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Line dataKey="soc" stroke="#38bdf8" strokeWidth={2} />
          </LineChart>
        </ChartCard>
        <ChartCard title="峰谷电价曲线">
          <LineChart data={result.priceSeries}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="hour" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Line dataKey="price" stroke="#f59e0b" strokeWidth={2} />
          </LineChart>
        </ChartCard>
        <ChartCard title="储能充放电功率曲线">
          <BarChart data={result.powerSeries}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="hour" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Bar dataKey="chargePower" fill="#22d3ee" radius={[8, 8, 0, 0]} />
            <Bar dataKey="dischargePower" fill="#818cf8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="h-[340px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
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
