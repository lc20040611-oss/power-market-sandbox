"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParticipantClearingResult, ScenarioComparisonResult } from "@/lib/types";

const palette = ["#38bdf8", "#22d3ee", "#818cf8", "#f59e0b", "#34d399", "#fb7185", "#f97316"];

function EmptyChart({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-slate-400">暂无图表数据。</CardContent>
    </Card>
  );
}

export function BidCurveChart({ data }: { data: ParticipantClearingResult[] }) {
  if (data.length === 0) return <EmptyChart title="报价曲线" />;
  return (
    <Card className="h-[360px]">
      <CardHeader>
        <CardTitle>报价曲线</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="price" stroke="#38bdf8" name="报价 (元/MWh)" strokeWidth={2} />
            <Line
              type="monotone"
              dataKey="declaredQuantity"
              stroke="#22d3ee"
              name="申报电量 (MWh)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function AwardChart({ data }: { data: ParticipantClearingResult[] }) {
  if (data.length === 0) return <EmptyChart title="成交结果" />;
  return (
    <Card className="h-[360px]">
      <CardHeader>
        <CardTitle>成交结果</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Bar dataKey="awardedQuantity" name="中标电量 (MWh)" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.id} fill={palette[index % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProfitChart({ data }: { data: ParticipantClearingResult[] }) {
  if (data.length === 0) return <EmptyChart title="主体收益" />;
  return (
    <Card className="h-[360px]">
      <CardHeader>
        <CardTitle>主体收益</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Bar dataKey="profit" name="利润 (元)" radius={[8, 8, 0, 0]} fill="#22d3ee" />
            <Bar dataKey="revenue" name="净收益 (元)" radius={[8, 8, 0, 0]} fill="#818cf8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ScenarioCompareChart({ data }: { data: ScenarioComparisonResult[] }) {
  if (data.length === 0) return <EmptyChart title="规则场景综合对比" />;
  return (
    <Card className="h-[420px]">
      <CardHeader>
        <CardTitle>规则场景综合对比</CardTitle>
      </CardHeader>
      <CardContent className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenarioName" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Bar dataKey="clearingPrice" name="出清电价" fill="#38bdf8" radius={[8, 8, 0, 0]} />
            <Bar dataKey="customerPurchaseCost" name="用户购电成本" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            <Bar dataKey="renewableConsumptionRate" name="新能源消纳率" fill="#34d399" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ScenarioPriceChart({ data }: { data: ScenarioComparisonResult[] }) {
  if (data.length === 0) return <EmptyChart title="出清电价对比" />;
  return (
    <Card className="h-[340px]">
      <CardHeader>
        <CardTitle>出清电价对比</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenarioName" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Bar dataKey="clearingPrice" fill="#38bdf8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ScenarioCostChart({ data }: { data: ScenarioComparisonResult[] }) {
  if (data.length === 0) return <EmptyChart title="用户购电成本对比" />;
  return (
    <Card className="h-[340px]">
      <CardHeader>
        <CardTitle>用户购电成本对比</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenarioName" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Bar dataKey="customerPurchaseCost" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ScenarioRenewableChart({ data }: { data: ScenarioComparisonResult[] }) {
  if (data.length === 0) return <EmptyChart title="新能源消纳率对比" />;
  return (
    <Card className="h-[340px]">
      <CardHeader>
        <CardTitle>新能源消纳率对比</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenarioName" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Bar dataKey="renewableConsumptionRate" fill="#34d399" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ScenarioProfitChart({ data }: { data: Array<Record<string, number | string>> }) {
  if (data.length === 0) return <EmptyChart title="主体利润对比" />;
  const profitKeys = data.length > 0 ? Object.keys(data[0]).filter((key) => key !== "scenarioName") : [];

  return (
    <Card className="h-[380px]">
      <CardHeader>
        <CardTitle>主体利润对比</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="scenarioName" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            {profitKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={palette[index % palette.length]}
                radius={[8, 8, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
