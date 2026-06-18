import assert from "node:assert/strict";
import test from "node:test";

import { computeCapacityPayments } from "../src/lib/capacity";
import { computeContractSettlements } from "../src/lib/contracts";
import {
  buildExperimentConfigFromTemplate,
  experimentTemplates,
  runExperiment
} from "../src/lib/experiment-runner";
import {
  exportExperimentResultsCsv,
  exportExperimentResultsJson
} from "../src/lib/export-utils";
import { runMarketClearing } from "../src/lib/market-clearing";
import { computeMarketPowerMetrics } from "../src/lib/market-power";
import {
  countParameterCombinations,
  getDefaultSweepConfigs,
  runParameterSweep
} from "../src/lib/parameter-sweep";
import { generateResearchReportDraft } from "../src/lib/paper-tools";
import { computeRenewableMetrics } from "../src/lib/renewables";
import { defaultRuleConfig } from "../src/lib/rule-config";
import { optimizeStorageDispatch } from "../src/lib/storage-optimizer";
import { simulateStorageOperation } from "../src/lib/storage";
import type { RuleConfig, SimulationInput, StorageAsset } from "../src/lib/types";

function singlePeriodInput(input: SimulationInput): SimulationInput {
  return {
    ...input,
    timePeriods: [{ id: "T1", label: "T1", loadDemand: input.loadDemand }]
  };
}

const input: SimulationInput = singlePeriodInput({
  loadDemand: 150,
  participants: [
    { id: "g1", name: "火电 1", type: "火电", price: 100, marginalCost: 70, declaredQuantity: 80 },
    { id: "g2", name: "火电 2", type: "火电", price: 150, marginalCost: 100, declaredQuantity: 100 },
    { id: "r1", name: "新能源 1", type: "新能源", price: 100, marginalCost: 10, declaredQuantity: 30 }
  ]
});

function withRuleConfig(partial: Partial<RuleConfig>): RuleConfig {
  return {
    ...defaultRuleConfig,
    ...partial
  };
}

test("统一出清价和按报价支付的收入计算不同", () => {
  const uniformResult = runMarketClearing(input, withRuleConfig({ clearingMechanism: "uniformPrice" }));
  const payAsBidResult = runMarketClearing(input, withRuleConfig({ clearingMechanism: "payAsBid" }));

  const uniformFirstUnit = uniformResult.participants.find((participant) => participant.id === "g1");
  const payAsBidFirstUnit = payAsBidResult.participants.find((participant) => participant.id === "g1");

  assert.ok(uniformFirstUnit);
  assert.ok(payAsBidFirstUnit);
  assert.equal(uniformFirstUnit.energyRevenue, 12000);
  assert.equal(payAsBidFirstUnit.energyRevenue, 8000);
});

test("价格上限生效", () => {
  const result = runMarketClearing(input, withRuleConfig({ priceCap: 120 }));

  assert.equal(result.clearingPrice, 120);
});

test("新能源优先出清在同报价下优先中标", () => {
  const priorityInput = singlePeriodInput({
    loadDemand: 100,
    participants: [
      { id: "g1", name: "火电 A", type: "火电", price: 100, marginalCost: 70, declaredQuantity: 60 },
      { id: "r1", name: "新能源 A", type: "新能源", price: 100, marginalCost: 10, declaredQuantity: 60 },
      { id: "g2", name: "火电 B", type: "火电", price: 160, marginalCost: 110, declaredQuantity: 100 }
    ]
  });

  const withoutPriority = runMarketClearing(priorityInput, withRuleConfig({ renewablePriority: false }));
  const withPriority = runMarketClearing(priorityInput, withRuleConfig({ renewablePriority: true }));

  const renewableWithoutPriority = withoutPriority.participants.find((participant) => participant.id === "r1");
  const renewableWithPriority = withPriority.participants.find((participant) => participant.id === "r1");

  assert.ok(renewableWithoutPriority);
  assert.ok(renewableWithPriority);
  assert.equal(renewableWithoutPriority.awardedQuantity, 40);
  assert.equal(renewableWithPriority.awardedQuantity, 60);
});

test("容量补偿计算正确", () => {
  const result = runMarketClearing(input, withRuleConfig({ enableCapacityPayment: true, capacityPaymentRate: 10 }));
  const firstUnit = result.participants.find((participant) => participant.id === "g1");

  assert.ok(firstUnit);
  assert.equal(firstUnit.capacityPayment, 800);
  assert.equal(result.capacityPaymentTotal, 2100);
});

test("偏差惩罚计算正确", () => {
  const penaltyInput = singlePeriodInput({
    loadDemand: 150,
    participants: [
      { id: "g1", name: "火电 1", type: "火电", price: 100, marginalCost: 70, declaredQuantity: 80, actualQuantity: 80 },
      { id: "g2", name: "火电 2", type: "火电", price: 150, marginalCost: 100, declaredQuantity: 100, actualQuantity: 70 }
    ]
  });

  const result = runMarketClearing(
    penaltyInput,
    withRuleConfig({
      enableDeviationPenalty: true,
      deviationTolerance: 0,
      deviationPenaltyRate: 5
    })
  );

  const secondUnit = result.participants.find((participant) => participant.id === "g2");

  assert.ok(secondUnit);
  assert.equal(secondUnit.awardedQuantity, 70);
  assert.equal(secondUnit.deviationPenalty, 150);
});

test("中长期合约收益和现货偏差结算正确", () => {
  const contractInput = singlePeriodInput({
    loadDemand: 100,
    participants: [
      {
        id: "g1",
        name: "火电 1",
        type: "火电",
        price: 120,
        marginalCost: 70,
        declaredQuantity: 100,
        contractQuantity: 60,
        contractPrice: 300,
        actualQuantity: 80
      }
    ]
  });

  const result = runMarketClearing(contractInput, withRuleConfig({}));
  const settlements = computeContractSettlements(result.participants);

  assert.equal(settlements[0].contractRevenue, 18000);
  assert.equal(settlements[0].spotQuantity, 20);
  assert.equal(settlements[0].spotSettlementAmount, 2400);
});

test("新能源消纳率和弃风弃光率正确", () => {
  const renewableInput = singlePeriodInput({
    loadDemand: 60,
    participants: [
      {
        id: "r1",
        name: "新能源 1",
        type: "新能源",
        price: 0,
        marginalCost: 10,
        declaredQuantity: 50,
        availableOutput: 80,
        forecastOutput: 70
      },
      { id: "g1", name: "火电 1", type: "火电", price: 200, marginalCost: 100, declaredQuantity: 40 }
    ]
  });

  const result = runMarketClearing(renewableInput, withRuleConfig({}));
  const metrics = computeRenewableMetrics(result.participants);

  assert.equal(metrics.totalClearedOutput, 50);
  assert.equal(metrics.totalCurtailedOutput, 30);
  assert.equal(metrics.consumptionRate, 0.63);
  assert.equal(metrics.curtailmentRate, 0.38);
});

test("储能套利收益正确", () => {
  const asset: StorageAsset = {
    participantId: "s1",
    participantName: "储能 1",
    storageCapacity: 100,
    chargePower: 20,
    dischargePower: 20,
    roundTripEfficiency: 0.9,
    initialSoc: 0.5,
    minSoc: 0.2,
    maxSoc: 0.9
  };
  const result = simulateStorageOperation(asset, [100, 100, 300, 300], [200, 180, 260, 280]);

  assert.equal(result.chargeCost, 4000);
  assert.equal(result.dischargeRevenue, 10800);
  assert.equal(result.netArbitrageRevenue, 6800);
});

test("容量补偿收入正确", () => {
  const result = runMarketClearing(
    input,
    withRuleConfig({ enableCapacityPayment: true, capacityPaymentRate: 10 })
  );
  const capacityResults = computeCapacityPayments(result.participants);

  assert.equal(capacityResults[0].capacityRevenue, 800);
  assert.equal(capacityResults[0].capacityPrice, 10);
});

test("HHI 和 RSI 指标正确", () => {
  const metrics = computeMarketPowerMetrics({
    loadDemand: 100,
    participants: [
      { id: "g1", name: "机组 1", type: "火电", price: 100, marginalCost: 70, declaredQuantity: 50 },
      { id: "g2", name: "机组 2", type: "火电", price: 120, marginalCost: 80, declaredQuantity: 30 },
      { id: "g3", name: "机组 3", type: "火电", price: 140, marginalCost: 90, declaredQuantity: 20 }
    ]
  });

  assert.equal(metrics.hhi, 3912.16);
  assert.equal(metrics.rsi, 0.5);
});

test("策略报价会改变出清价格", () => {
  const metrics = computeMarketPowerMetrics({
    loadDemand: 100,
    participants: [
      { id: "g1", name: "机组 1", type: "火电", price: 100, marginalCost: 70, declaredQuantity: 50 },
      { id: "g2", name: "机组 2", type: "火电", price: 120, marginalCost: 80, declaredQuantity: 30 },
      { id: "g3", name: "机组 3", type: "火电", price: 140, marginalCost: 90, declaredQuantity: 20 }
    ]
  });

  const markupScenario = metrics.strategyScenarios.find((item) => item.scenario === "markup20");
  assert.ok(markupScenario);
  assert.equal(markupScenario.clearingPrice > 140, true);
});

test("参数扫描能生成正确数量的实验组合", () => {
  const sweepConfig = [getDefaultSweepConfigs()[0], getDefaultSweepConfigs()[4]];
  const results = runParameterSweep(input, sweepConfig, defaultRuleConfig);

  assert.equal(results.length, 16);
  assert.equal(countParameterCombinations(sweepConfig), 16);
});

test("新能源占比变化会影响新能源消纳指标", () => {
  const renewableResults = runParameterSweep(input, getDefaultSweepConfigs()[0], defaultRuleConfig);

  assert.equal(
    renewableResults[0].renewableConsumptionRate !== renewableResults[renewableResults.length - 1].renewableConsumptionRate,
    true
  );
});

test("偏差惩罚系数变化会影响偏差惩罚金额", () => {
  const variedInput = singlePeriodInput({
    loadDemand: 150,
    participants: [
      { id: "g1", name: "火电 1", type: "火电", price: 100, marginalCost: 70, declaredQuantity: 80, actualQuantity: 60 },
      { id: "g2", name: "火电 2", type: "火电", price: 150, marginalCost: 100, declaredQuantity: 100, actualQuantity: 70 }
    ]
  });
  const results = runParameterSweep(variedInput, getDefaultSweepConfigs()[2], defaultRuleConfig);

  assert.equal(results[0].deviationPenaltyTotal < results[results.length - 1].deviationPenaltyTotal, true);
});

test("容量补偿价格变化会影响容量补偿总额", () => {
  const results = runParameterSweep(input, getDefaultSweepConfigs()[3], defaultRuleConfig);

  assert.equal(results[0].capacityPaymentTotal < results[results.length - 1].capacityPaymentTotal, true);
});

test("多时段出清会生成时段结果", () => {
  const result = runMarketClearing({
    loadDemand: 300,
    timePeriods: [
      { id: "T1", label: "T1", loadDemand: 90 },
      { id: "T2", label: "T2", loadDemand: 100 },
      { id: "T3", label: "T3", loadDemand: 110 }
    ],
    participants: [
      { id: "g1", name: "火电 1", type: "火电", price: 200, marginalCost: 120, declaredQuantity: 120 },
      { id: "g2", name: "火电 2", type: "火电", price: 260, marginalCost: 180, declaredQuantity: 120 }
    ]
  });

  assert.equal(result.periodResults.length, 3);
  assert.equal(result.isMultiPeriod, true);
  assert.equal(result.totalClearedQuantity > 0, true);
});

test("储能时序优化会生成充放电计划", () => {
  const plan = optimizeStorageDispatch(
    {
      id: "s1",
      name: "储能 1",
      type: "储能",
      price: 300,
      marginalCost: 0,
      declaredQuantity: 0,
      storageCapacity: 100,
      chargePower: 25,
      dischargePower: 25,
      roundTripEfficiency: 0.9,
      initialSoc: 0.5,
      minSoc: 0.1,
      maxSoc: 0.9
    },
    [
      { id: "T1", label: "T1", loadDemand: 80 },
      { id: "T2", label: "T2", loadDemand: 120 },
      { id: "T3", label: "T3", loadDemand: 140 }
    ],
    [180, 220, 360]
  );

  assert.ok(plan);
  assert.equal(plan.steps.length, 3);
});

test("CSV 导出格式正确", () => {
  const record = runExperiment(buildExperimentConfigFromTemplate(experimentTemplates[0]), input);
  const csv = exportExperimentResultsCsv(record);

  assert.equal(csv.content.includes("实验名称"), true);
  assert.equal(csv.mimeType, "text/csv");
});

test("JSON 导出包含完整实验参数", () => {
  const record = runExperiment(buildExperimentConfigFromTemplate(experimentTemplates[0]), input);
  const json = exportExperimentResultsJson(record);

  assert.equal(json.content.includes('"variableParameters"'), true);
  assert.equal(json.mimeType, "application/json");
});

test("研究报告草稿包含必要章节", () => {
  const record = runExperiment(buildExperimentConfigFromTemplate(experimentTemplates[0]), input);
  const draft = generateResearchReportDraft(record);

  assert.equal(draft.markdown.includes("# 研究问题"), true);
  assert.equal(draft.markdown.includes("# 实验设计"), true);
  assert.equal(draft.markdown.includes("# 政策启示"), true);
});
