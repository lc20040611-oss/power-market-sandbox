"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { scenarioPresets } from "@/data/scenario-presets";
import { AwardChart, BidCurveChart, ProfitChart } from "@/components/charts/chart-shell";
import { runMarketClearing } from "@/lib/market-clearing";
import { createEmptyClearingResult, normalizeClearingResult, normalizeRuleConfig, normalizeSimulationInput } from "@/lib/runtime-guards";
import { defaultRuleConfig, STORAGE_KEYS } from "@/lib/rule-config";
import { readStorage, writeStorage } from "@/lib/storage-utils";
import type {
  MarketParticipant,
  ParticipantType,
  RuleConfig,
  SimulationInput,
  ClearingResult
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const defaultScenario = scenarioPresets[0].input;
const participantTypes: ParticipantType[] = ["火电", "新能源", "储能"];
const loadProfile = [0.88, 0.82, 0.95, 1.04, 1.12, 1.05];

function createTimePeriods(loadDemand: number, count = loadProfile.length) {
  const profile = Array.from({ length: count }, (_, index) => loadProfile[index % loadProfile.length]);
  const average = profile.reduce((sum, value) => sum + value, 0) / profile.length;

  return profile.map((value, index) => ({
    id: `T${index + 1}`,
    label: `T${index + 1}`,
    loadDemand: Math.round(((loadDemand * value) / average) * 100) / 100,
    priceHint: 0
  }));
}

function withEditablePeriods(input: SimulationInput): SimulationInput {
  return {
    ...input,
    timePeriods: input.timePeriods?.length ? input.timePeriods : createTimePeriods(input.loadDemand)
  };
}

function createParticipant(index: number): MarketParticipant {
  return {
    id: `participant-${Date.now()}-${index}`,
    name: `新增主体 ${index}`,
    type: "火电",
    price: 300,
    marginalCost: 220,
    declaredQuantity: 100,
    contractQuantity: 0,
    contractPrice: 0,
    actualQuantity: 100,
    availableOutput: 100,
    forecastOutput: 100,
    availableCapacity: 100,
    capacityAvailabilityRate: 1
  };
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function SimulationWorkbench() {
  const [form, setForm] = useState<SimulationInput>(() =>
    withEditablePeriods(normalizeSimulationInput(defaultScenario, defaultScenario))
  );
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>(() => normalizeRuleConfig(defaultRuleConfig));
  const [result, setResult] = useState<ClearingResult>(() =>
    normalizeClearingResult(
      runMarketClearing(defaultScenario, defaultRuleConfig),
      defaultScenario,
      defaultRuleConfig
    )
  );
  const [isRunning, setIsRunning] = useState(false);
  const [feedback, setFeedback] = useState("准备运行仿真");

  useEffect(() => {
    const storedInput = normalizeSimulationInput(
      readStorage<SimulationInput>(STORAGE_KEYS.marketInput, defaultScenario),
      defaultScenario
    );
    const storedRuleConfig = normalizeRuleConfig(
      readStorage<RuleConfig>(STORAGE_KEYS.ruleConfig, defaultRuleConfig)
    );

    const editableInput = withEditablePeriods(storedInput);
    setForm(editableInput);
    setRuleConfig(storedRuleConfig);

    try {
      setResult(
        normalizeClearingResult(
          runMarketClearing(editableInput, storedRuleConfig),
          editableInput,
          storedRuleConfig
        )
      );
    } catch (error) {
      console.error("[simulation] failed to restore saved run", error, {
        input: storedInput,
        ruleConfig: storedRuleConfig
      });
      setResult(createEmptyClearingResult(storedRuleConfig, storedInput.participants));
      setFeedback(`恢复历史仿真失败：${formatError(error)}`);
    }
  }, []);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.marketResult, result);
  }, [result]);

  const updateLoadDemand = (value: string) => {
    const loadDemand = value === "" ? 0 : Number(value);
    setForm((current) => ({
      ...current,
      loadDemand,
      timePeriods:
        current.timePeriods?.length === 1
          ? [{ ...current.timePeriods[0], loadDemand }]
          : current.timePeriods
    }));
  };

  const setSimulationMode = (mode: "single" | "multi") => {
    setForm((current) => ({
      ...current,
      timePeriods:
        mode === "single"
          ? [{ id: "T1", label: "T1", loadDemand: current.loadDemand, priceHint: 0 }]
          : createTimePeriods(current.loadDemand)
    }));
    setFeedback(mode === "single" ? "已切换为单一时段" : "已切换为多时段");
  };

  const addParticipant = () => {
    setForm((current) => ({
      ...current,
      participants: [...current.participants, createParticipant(current.participants.length + 1)]
    }));
    setFeedback("已新增一个市场主体");
  };

  const removeParticipant = (participantId: string) => {
    setForm((current) => ({
      ...current,
      participants: current.participants.filter((participant) => participant.id !== participantId)
    }));
    setFeedback("已删除市场主体，点击运行仿真后更新结果");
  };

  const updateTimePeriod = (periodId: string, field: "label" | "loadDemand", value: string) => {
    setForm((current) => ({
      ...current,
      timePeriods: current.timePeriods?.map((period) =>
        period.id === periodId
          ? { ...period, [field]: field === "label" ? value : value === "" ? 0 : Number(value) }
          : period
      )
    }));
  };

  const addTimePeriod = () => {
    setForm((current) => {
      const periods = current.timePeriods ?? [];
      const index = periods.length + 1;
      return {
        ...current,
        timePeriods: [
          ...periods,
          { id: `T${Date.now()}`, label: `T${index}`, loadDemand: current.loadDemand, priceHint: 0 }
        ]
      };
    });
  };

  const removeTimePeriod = (periodId: string) => {
    setForm((current) => ({
      ...current,
      timePeriods: current.timePeriods?.filter((period) => period.id !== periodId)
    }));
  };

  const updateParticipant = (
    index: number,
    field: keyof Pick<
      MarketParticipant,
      "name" | "type" | "price" | "marginalCost" | "declaredQuantity" | "contractQuantity" | "contractPrice" | "actualQuantity"
    >,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      participants: current.participants.map((participant, participantIndex) =>
        participantIndex === index
          ? {
              ...participant,
              [field]:
                field === "name" || field === "type"
                  ? value
                  : value === ""
                    ? 0
                    : Number(value)
            }
          : participant
      )
    }));
  };

  const handleRun = async () => {
    const normalizedInput = normalizeSimulationInput(form, defaultScenario);
    const normalizedRuleConfig = normalizeRuleConfig(ruleConfig);

    setIsRunning(true);
    setFeedback("仿真运行中...");
    writeStorage(STORAGE_KEYS.marketInput, normalizedInput);
    writeStorage(STORAGE_KEYS.ruleConfig, normalizedRuleConfig);
    console.info("[simulation] run requested", {
      input: normalizedInput,
      ruleConfig: normalizedRuleConfig
    });

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
    await new Promise<void>((resolve) => {
      window.setTimeout(() => resolve(), 180);
    });

    try {
      const nextResult = normalizeClearingResult(
        runMarketClearing(normalizedInput, normalizedRuleConfig),
        normalizedInput,
        normalizedRuleConfig
      );
      console.info("[simulation] run result", nextResult);
      setForm(normalizedInput);
      setRuleConfig(normalizedRuleConfig);
      setResult(nextResult);
      setFeedback(
        `仿真完成：出清电价 ${nextResult.clearingPrice} 元/MWh，成交电量 ${nextResult.totalClearedQuantity} MWh`
      );
    } catch (error) {
      console.error("[simulation] run failed", error, {
        input: normalizedInput,
        ruleConfig: normalizedRuleConfig
      });
      setResult(createEmptyClearingResult(normalizedRuleConfig, normalizedInput.participants));
      setFeedback(`仿真失败：${formatError(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const loadScenario = (index: number) => {
    const selected = withEditablePeriods(normalizeSimulationInput(scenarioPresets[index].input, defaultScenario));
    setForm(selected);
    setFeedback(`已载入场景：${scenarioPresets[index].scenario}`);
    try {
      setResult(
        normalizeClearingResult(runMarketClearing(selected, ruleConfig), selected, ruleConfig)
      );
    } catch (error) {
      console.error("[simulation] scenario load failed", error, {
        scenario: scenarioPresets[index].scenario,
        input: selected,
        ruleConfig
      });
      setResult(createEmptyClearingResult(ruleConfig, selected.participants));
      setFeedback(`场景加载失败：${formatError(error)}`);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>市场仿真输入</CardTitle>
          <CardDescription>保持现有页面结构，仿真时会自动应用当前规则配置。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {scenarioPresets.map((preset, index) => (
              <Button key={preset.scenario} variant="outline" size="sm" onClick={() => loadScenario(index)}>
                {preset.scenario}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
            <Badge>当前规则</Badge>
            <span>
              {ruleConfig.clearingMechanism === "uniformPrice" ? "统一出清价" : "按报价支付"}
            </span>
            <span>价格区间 {ruleConfig.priceFloor} - {ruleConfig.priceCap}</span>
            <span>新能源优先 {ruleConfig.renewablePriority ? "开启" : "关闭"}</span>
            <span>容量补偿 {ruleConfig.enableCapacityPayment ? "开启" : "关闭"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-300">仿真时段</span>
            <Button
              type="button"
              size="sm"
              variant={form.timePeriods?.length === 1 ? "default" : "outline"}
              onClick={() => setSimulationMode("single")}
            >
              单一时段
            </Button>
            <Button
              type="button"
              size="sm"
              variant={form.timePeriods?.length !== 1 ? "default" : "outline"}
              onClick={() => setSimulationMode("multi")}
            >
              多时段
            </Button>
            <Badge variant="secondary">当前 {form.timePeriods?.length ?? 0} 个时段</Badge>
          </div>

          <NumberField label="负荷需求 (MWh)" value={form.loadDemand} onChange={updateLoadDemand} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">可编辑输入表格</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">规则研究沙盒输入</Badge>
                <Button type="button" size="sm" variant="outline" onClick={addParticipant}>
                  <Plus data-icon="inline-start" />
                  新增主体
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 text-left text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">主体名称</th>
                    <th className="px-4 py-3 font-medium">类型</th>
                    <th className="px-4 py-3 font-medium">报价</th>
                    <th className="px-4 py-3 font-medium">边际成本</th>
                    <th className="px-4 py-3 font-medium">申报电量</th>
                    <th className="px-4 py-3 font-medium">合约电量</th>
                    <th className="px-4 py-3 font-medium">合约价格</th>
                    <th className="px-4 py-3 font-medium">实际执行电量</th>
                    <th className="px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {form.participants.map((participant, index) => (
                    <tr key={participant.id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        <Input
                          value={participant.name}
                          onChange={(event) => updateParticipant(index, "name", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                          value={participant.type}
                          onChange={(event) => updateParticipant(index, "type", event.target.value)}
                        >
                          {participantTypes.map((type) => (
                            <option key={type} value={type} className="bg-slate-950">
                              {type}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={participant.price}
                          onChange={(event) => updateParticipant(index, "price", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={participant.marginalCost}
                          onChange={(event) => updateParticipant(index, "marginalCost", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={participant.declaredQuantity}
                          onChange={(event) => updateParticipant(index, "declaredQuantity", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={participant.contractQuantity ?? 0}
                          onChange={(event) => updateParticipant(index, "contractQuantity", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={participant.contractPrice ?? 0}
                          onChange={(event) => updateParticipant(index, "contractPrice", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={participant.actualQuantity ?? participant.declaredQuantity}
                          onChange={(event) => updateParticipant(index, "actualQuantity", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={form.participants.length <= 1}
                          aria-label={`删除${participant.name}`}
                          onClick={() => removeParticipant(participant.id)}
                        >
                          <Trash2 data-icon="inline-start" />
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">时段负荷表</h3>
                <p className="text-sm text-slate-400">单一时段保留一行；多时段可新增、删除并分别设置负荷。</p>
              </div>
              {form.timePeriods?.length !== 1 ? (
                <Button type="button" size="sm" variant="outline" onClick={addTimePeriod}>
                  <Plus data-icon="inline-start" />
                  新增时段
                </Button>
              ) : null}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 text-left text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">时段名称</th>
                    <th className="px-4 py-3 font-medium">负荷需求 (MWh)</th>
                    <th className="px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {form.timePeriods?.map((period) => (
                    <tr key={period.id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        <Input
                          value={period.label}
                          aria-label={`${period.label}时段名称`}
                          onChange={(event) => updateTimePeriod(period.id, "label", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          value={period.loadDemand}
                          aria-label={`${period.label}负荷需求`}
                          onChange={(event) => updateTimePeriod(period.id, "loadDemand", event.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={(form.timePeriods?.length ?? 0) <= 2}
                          aria-label={`删除${period.label}`}
                          onClick={() => removeTimePeriod(period.id)}
                        >
                          <Trash2 data-icon="inline-start" />
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => void handleRun()} disabled={isRunning}>
              {isRunning ? "运行中..." : "运行仿真"}
            </Button>
            <span className="text-sm text-cyan-200">{feedback}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>系统指标</CardTitle>
          <CardDescription>点击运行后自动更新结果与图表。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Metric label="出清电价" value={`${result.clearingPrice} 元/MWh`} />
          <Metric label="总成交电量" value={`${result.totalClearedQuantity} MWh`} />
          <Metric label="用户购电成本" value={`${result.customerPurchaseCost} 元`} />
          <Metric label="发电侧总收益" value={`${result.totalGeneratorRevenue} 元`} />
          <Metric label="系统总成本" value={`${result.totalSystemCost} 元`} />
          <Metric label="社会福利" value={`${result.socialWelfare} 元`} />
          <Metric label="时段数量" value={`${result.periodResults.length} 个`} />
          <Metric label="新能源中标电量" value={`${result.renewableAwardedQuantity} MWh`} />
          <Metric label="新能源消纳率" value={`${(result.renewableConsumptionRate * 100).toFixed(2)}%`} />
          <Metric label="弃风弃光电量" value={`${result.renewableCurtailmentQuantity} MWh`} />
          <Metric label="容量补偿总额" value={`${result.capacityPaymentTotal} 元`} />
          <Metric label="偏差惩罚总额" value={`${result.deviationPenaltyTotal} 元`} />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>主体结果表</CardTitle>
            <CardDescription>展示结算价、申报电量、中标电量、补贴、惩罚与利润。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 text-left text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">主体</th>
                    <th className="px-4 py-3 font-medium">类型</th>
                    <th className="px-4 py-3 font-medium">结算价</th>
                    <th className="px-4 py-3 font-medium">报价</th>
                    <th className="px-4 py-3 font-medium">边际成本</th>
                    <th className="px-4 py-3 font-medium">申报电量</th>
                    <th className="px-4 py-3 font-medium">中标电量</th>
                    <th className="px-4 py-3 font-medium">合约收益</th>
                    <th className="px-4 py-3 font-medium">偏差结算</th>
                    <th className="px-4 py-3 font-medium">收入</th>
                    <th className="px-4 py-3 font-medium">成本</th>
                    <th className="px-4 py-3 font-medium">利润</th>
                  </tr>
                </thead>
                <tbody>
                  {result.participants.map((participant) => (
                    <tr key={participant.id} className="border-t border-white/10 text-slate-300">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span>{participant.name}</span>
                          {participant.isMarginalUnit ? <Badge>边际机组</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">{participant.type}</td>
                      <td className="px-4 py-3">{participant.settlementPrice}</td>
                      <td className="px-4 py-3">{participant.price}</td>
                      <td className="px-4 py-3">{participant.marginalCost}</td>
                      <td className="px-4 py-3">{participant.declaredQuantity}</td>
                      <td className="px-4 py-3">{participant.awardedQuantity}</td>
                      <td className="px-4 py-3">{participant.contractRevenue}</td>
                      <td className="px-4 py-3">{participant.spotSettlementAmount}</td>
                      <td className="px-4 py-3">{participant.revenue}</td>
                      <td className="px-4 py-3">{participant.totalCost}</td>
                      <td className="px-4 py-3">{participant.profit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-3">
          <BidCurveChart data={result.participants} />
          <AwardChart data={result.participants} />
          <ProfitChart data={result.participants} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>时段出清结果</CardTitle>
            <CardDescription>展示单一或多时段电价、基础负荷、储能充电负荷和未满足需求。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 text-left text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-medium">时段</th>
                    <th className="px-4 py-3 font-medium">基础负荷</th>
                    <th className="px-4 py-3 font-medium">储能充电负荷</th>
                    <th className="px-4 py-3 font-medium">储能放电出力</th>
                    <th className="px-4 py-3 font-medium">出清电价</th>
                    <th className="px-4 py-3 font-medium">成交电量</th>
                    <th className="px-4 py-3 font-medium">未满足需求</th>
                  </tr>
                </thead>
                <tbody>
                  {result.periodResults.map((period) => (
                    <tr key={period.periodId} className="border-t border-white/10 text-slate-300">
                      <td className="px-4 py-3">{period.periodLabel}</td>
                      <td className="px-4 py-3">{period.baseLoadDemand}</td>
                      <td className="px-4 py-3">{period.storageChargingLoad}</td>
                      <td className="px-4 py-3">{period.storageDischargingSupply}</td>
                      <td className="px-4 py-3">{period.clearingPrice}</td>
                      <td className="px-4 py-3">{period.totalClearedQuantity}</td>
                      <td className="px-4 py-3">{period.unmetDemand}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>储能时序优化</CardTitle>
            <CardDescription>基于参考价格轨迹进行时序充放电优化，并回灌到多时段出清。</CardDescription>
          </CardHeader>
          <CardContent>
            {result.storageDispatchPlans.length > 0 ? (
              <div className="space-y-4">
                {result.storageDispatchPlans.map((plan) => (
                  <div key={plan.participantId} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                      <Badge>{plan.participantName}</Badge>
                      <span>套利收益 {plan.netArbitrageRevenue} 元</span>
                      <span>等效循环 {plan.equivalentCycles}</span>
                      <span>削峰 {plan.peakLoadReduction} MW</span>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-slate-400">
                          <tr>
                            <th className="px-3 py-2 font-medium">时段</th>
                            <th className="px-3 py-2 font-medium">参考价格</th>
                            <th className="px-3 py-2 font-medium">充电功率</th>
                            <th className="px-3 py-2 font-medium">放电功率</th>
                            <th className="px-3 py-2 font-medium">SOC 起点</th>
                            <th className="px-3 py-2 font-medium">SOC 终点</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.steps.map((step) => (
                            <tr key={`${plan.participantId}-${step.periodId}`} className="border-t border-white/10 text-slate-300">
                              <td className="px-3 py-2">{step.periodLabel}</td>
                              <td className="px-3 py-2">{step.referencePrice}</td>
                              <td className="px-3 py-2">{step.chargePower}</td>
                              <td className="px-3 py-2">{step.dischargePower}</td>
                              <td className="px-3 py-2">{step.socStart}</td>
                              <td className="px-3 py-2">{step.socEnd}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">当前场景没有可优化的储能主体。</p>
            )}
          </CardContent>
        </Card>
      </div>
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
    <label className="space-y-2 text-sm text-slate-300">
      <span>{label}</span>
      <Input type="number" step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
