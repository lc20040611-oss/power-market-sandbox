"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { scenarioPresets } from "@/data/scenario-presets";
import {
  ScenarioCompareChart,
  ScenarioCostChart,
  ScenarioPriceChart,
  ScenarioProfitChart,
  ScenarioRenewableChart
} from "@/components/charts/chart-shell";
import { compareScenarios } from "@/lib/market-clearing";
import { defaultRuleConfig, ruleTemplates, STORAGE_KEYS } from "@/lib/rule-config";
import { readStorage, writeStorage } from "@/lib/storage-utils";
import type {
  ClearingMechanism,
  RuleConfig,
  ScenarioComparisonResult,
  ScenarioConfig,
  SimulationInput
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const mechanismOptions: Array<{ value: ClearingMechanism; label: string }> = [
  { value: "uniformPrice", label: "统一边际电价出清" },
  { value: "payAsBid", label: "按报价支付" }
];

export function RuleConfigPanel() {
  const [marketInput, setMarketInput] = useState<SimulationInput>(scenarioPresets[0].input);
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(defaultRuleConfig);
  const [scenarioList, setScenarioList] = useState<ScenarioConfig[]>(ruleTemplates);
  const [comparisonResults, setComparisonResults] = useState<ScenarioComparisonResult[]>(() =>
    compareScenarios(
      ruleTemplates.map((scenario) => ({
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        input: scenarioPresets[0].input,
        ruleConfig: scenario.ruleConfig
      }))
    )
  );

  useEffect(() => {
    setMarketInput(readStorage<SimulationInput>(STORAGE_KEYS.marketInput, scenarioPresets[0].input));
    setRuleConfig(readStorage<RuleConfig>(STORAGE_KEYS.ruleConfig, defaultRuleConfig));
  }, []);

  const updateRuleConfig = <K extends keyof RuleConfig>(key: K, value: RuleConfig[K]) => {
    setRuleConfig((current) => ({
      ...current,
      [key]: value
    }));
  };

  const saveCurrentConfig = () => {
    writeStorage(STORAGE_KEYS.ruleConfig, ruleConfig);
  };

  const addCurrentScenario = () => {
    const customScenario: ScenarioConfig = {
      id: `custom-${scenarioList.length + 1}`,
      name: `自定义规则 ${scenarioList.length - ruleTemplates.length + 1}`,
      ruleConfig: { ...ruleConfig }
    };

    setScenarioList((current) => [...current, customScenario]);
  };

  const runComparison = () => {
    saveCurrentConfig();
    const activeScenarios = [
      {
        id: "current-config",
        name: "当前配置",
        ruleConfig: { ...ruleConfig }
      },
      ...scenarioList
    ];

    setComparisonResults(
      compareScenarios(
        activeScenarios.map((scenario) => ({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          input: marketInput,
          ruleConfig: scenario.ruleConfig
        }))
      )
    );
  };

  const profitChartData = useMemo(() => {
    return comparisonResults.map((result) => {
      const row: Record<string, string | number> = { scenarioName: result.scenarioName };

      result.participantProfits.forEach((participant) => {
        row[participant.participantName] = participant.profit;
      });

      return row;
    });
  }, [comparisonResults]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>规则参数配置</CardTitle>
            <Badge>规则研究沙盒</Badge>
          </div>
          <CardDescription>
            使用当前市场主体和负荷数据，对不同规则参数进行多场景对比。基础市场输入来自
            <Link href="/simulation" className="ml-1 text-cyan-300 underline underline-offset-4">
              市场仿真页
            </Link>
            最近一次运行。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-6">
            <RuleSection title="出清机制">
              <SelectField
                label="出清机制选择"
                value={ruleConfig.clearingMechanism}
                onChange={(value) => updateRuleConfig("clearingMechanism", value as ClearingMechanism)}
                options={mechanismOptions}
              />
              <NumberField
                label="价格上限"
                value={ruleConfig.priceCap}
                onChange={(value) => updateRuleConfig("priceCap", Number(value))}
              />
              <NumberField
                label="价格下限"
                value={ruleConfig.priceFloor}
                onChange={(value) => updateRuleConfig("priceFloor", Number(value))}
              />
            </RuleSection>

            <RuleSection title="偏差考核机制">
              <ToggleField
                label="是否启用偏差考核"
                checked={ruleConfig.enableDeviationPenalty}
                onChange={(checked) => updateRuleConfig("enableDeviationPenalty", checked)}
              />
              <NumberField
                label="偏差容忍度"
                value={ruleConfig.deviationTolerance}
                step="0.01"
                onChange={(value) => updateRuleConfig("deviationTolerance", Number(value))}
              />
              <NumberField
                label="偏差惩罚单价"
                value={ruleConfig.deviationPenaltyRate}
                onChange={(value) => updateRuleConfig("deviationPenaltyRate", Number(value))}
              />
            </RuleSection>
          </div>

          <div className="space-y-6">
            <RuleSection title="新能源消纳机制">
              <ToggleField
                label="是否新能源优先"
                checked={ruleConfig.renewablePriority}
                onChange={(checked) => updateRuleConfig("renewablePriority", checked)}
              />
              <NumberField
                label="弃风弃光惩罚系数"
                value={ruleConfig.curtailmentPenalty}
                onChange={(value) => updateRuleConfig("curtailmentPenalty", Number(value))}
              />
              <NumberField
                label="新能源补贴单价"
                value={ruleConfig.renewableSubsidy}
                onChange={(value) => updateRuleConfig("renewableSubsidy", Number(value))}
              />
            </RuleSection>

            <RuleSection title="容量补偿机制">
              <ToggleField
                label="是否启用容量补偿"
                checked={ruleConfig.enableCapacityPayment}
                onChange={(checked) => updateRuleConfig("enableCapacityPayment", checked)}
              />
              <NumberField
                label="容量补偿单价"
                value={ruleConfig.capacityPaymentRate}
                onChange={(value) => updateRuleConfig("capacityPaymentRate", Number(value))}
              />
            </RuleSection>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>规则场景</CardTitle>
          <CardDescription>默认提供 5 个规则模板，也可以把当前表单配置追加为自定义场景。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {ruleTemplates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                size="sm"
                onClick={() => setRuleConfig({ ...template.ruleConfig })}
              >
                {template.name}
              </Button>
            ))}
            <Button size="sm" onClick={addCurrentScenario}>
              添加当前配置为场景
            </Button>
            <Button size="sm" onClick={runComparison}>
              运行场景对比
            </Button>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary">当前比较场景数 {comparisonResults.length}</Badge>
            <Badge variant="secondary">当前负荷 {marketInput.loadDemand} MWh</Badge>
            <Badge variant="secondary">主体数 {marketInput.participants.length}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>场景对比结果</CardTitle>
          <CardDescription>所有场景共用同一组市场主体和负荷数据，仅规则参数不同。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">场景</th>
                  <th className="px-4 py-3 font-medium">出清电价</th>
                  <th className="px-4 py-3 font-medium">总成交电量</th>
                  <th className="px-4 py-3 font-medium">用户购电成本</th>
                  <th className="px-4 py-3 font-medium">发电侧总收益</th>
                  <th className="px-4 py-3 font-medium">系统总成本</th>
                  <th className="px-4 py-3 font-medium">社会福利</th>
                  <th className="px-4 py-3 font-medium">新能源中标电量</th>
                  <th className="px-4 py-3 font-medium">新能源消纳率</th>
                  <th className="px-4 py-3 font-medium">弃风弃光电量</th>
                  <th className="px-4 py-3 font-medium">容量补偿总额</th>
                  <th className="px-4 py-3 font-medium">偏差惩罚总额</th>
                </tr>
              </thead>
              <tbody>
                {comparisonResults.map((result) => (
                  <tr key={result.scenarioId} className="border-t border-white/10 text-slate-300">
                    <td className="px-4 py-3">{result.scenarioName}</td>
                    <td className="px-4 py-3">{result.clearingPrice}</td>
                    <td className="px-4 py-3">{result.totalClearedQuantity}</td>
                    <td className="px-4 py-3">{result.customerPurchaseCost}</td>
                    <td className="px-4 py-3">{result.totalGeneratorRevenue}</td>
                    <td className="px-4 py-3">{result.totalSystemCost}</td>
                    <td className="px-4 py-3">{result.socialWelfare}</td>
                    <td className="px-4 py-3">{result.renewableAwardedQuantity}</td>
                    <td className="px-4 py-3">{(result.renewableConsumptionRate * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3">{result.renewableCurtailmentQuantity}</td>
                    <td className="px-4 py-3">{result.capacityPaymentTotal}</td>
                    <td className="px-4 py-3">{result.deviationPenaltyTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <ScenarioCompareChart data={comparisonResults} />
        <ScenarioProfitChart data={profitChartData} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ScenarioPriceChart data={comparisonResults} />
        <ScenarioCostChart data={comparisonResults} />
        <ScenarioRenewableChart data={comparisonResults} />
      </div>
    </div>
  );
}

function RuleSection({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "1"
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
  step?: string;
}) {
  return (
    <label className="block space-y-2 text-sm text-slate-300">
      <span>{label}</span>
      <Input type="number" value={value} step={step} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <label className="block space-y-2 text-sm text-slate-300">
      <span>{label}</span>
      <select
        className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-950">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
