"use client";

import { useEffect, useState } from "react";

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

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function SimulationWorkbench() {
  const [form, setForm] = useState<SimulationInput>(() => normalizeSimulationInput(defaultScenario, defaultScenario));
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

    setForm(storedInput);
    setRuleConfig(storedRuleConfig);

    try {
      setResult(
        normalizeClearingResult(
          runMarketClearing(storedInput, storedRuleConfig),
          storedInput,
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
    setForm((current) => ({
      ...current,
      loadDemand: value === "" ? 0 : Number(value)
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
    const selected = normalizeSimulationInput(scenarioPresets[index].input, defaultScenario);
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

          <NumberField label="负荷需求 (MWh)" value={form.loadDemand} onChange={updateLoadDemand} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">可编辑输入表格</h3>
              <Badge variant="secondary">规则研究沙盒输入</Badge>
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
            <CardTitle>多时段出清结果</CardTitle>
            <CardDescription>展示时段电价、基础负荷、储能充电负荷和未满足需求。</CardDescription>
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
