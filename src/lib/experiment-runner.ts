import { computeMarketPowerMetrics } from "./market-power";
import { runMarketClearing } from "./market-clearing";
import { countParameterCombinations, getDefaultSweepConfigs, runParameterSweep } from "./parameter-sweep";
import { computeRenewableMetrics } from "./renewables";
import { defaultRuleConfig } from "./rule-config";
import type {
  ExperimentConfig,
  ExperimentRunRecord,
  ExperimentRunSummary,
  ExperimentTemplate,
  ParameterSweepConfig,
  SimulationInput
} from "./types";

function createChartData(results: ExperimentRunRecord["results"]) {
  return results.map((result) => ({
    parameterValue: String(result.parameterValue),
    combinationLabel: result.combinationLabel,
    clearingPrice: result.clearingPrice,
    customerPurchaseCost: result.customerPurchaseCost,
    renewableConsumptionRate: result.renewableConsumptionRate,
    curtailmentRate: result.curtailmentRate,
    socialWelfare: result.socialWelfare,
    hhi: result.hhi
  }));
}

const defaultSweepConfigs = getDefaultSweepConfigs();

export const experimentTemplates: ExperimentTemplate[] = [
  {
    id: "renewable-penetration",
    name: "新能源渗透率敏感性实验",
    description: "考察新能源占比变化对价格、消纳和福利的影响。",
    config: {
      baseScenario: "基准场景",
      variableParameters: [defaultSweepConfigs[0]],
      fixedParameters: { clearingMechanism: "uniformPrice" }
    }
  },
  {
    id: "contract-ratio",
    name: "中长期合约比例敏感性实验",
    description: "考察不同合约比例下的现货暴露和收益结构。",
    config: {
      baseScenario: "高中长期合约比例",
      variableParameters: [defaultSweepConfigs[1]],
      fixedParameters: { contractSettlement: true }
    }
  },
  {
    id: "deviation-penalty",
    name: "偏差惩罚系数敏感性实验",
    description: "考察偏差考核机制对结算和市场行为的影响。",
    config: {
      baseScenario: "高现货暴露风险场景",
      variableParameters: [defaultSweepConfigs[2]],
      fixedParameters: { enableDeviationPenalty: true }
    }
  },
  {
    id: "capacity-price",
    name: "容量补偿价格敏感性实验",
    description: "考察容量补偿水平变化对系统收益与可靠性的影响。",
    config: {
      baseScenario: "基准场景",
      variableParameters: [defaultSweepConfigs[3]],
      fixedParameters: { enableCapacityPayment: true }
    }
  },
  {
    id: "storage-capacity",
    name: "储能容量配置敏感性实验",
    description: "考察储能容量扩张对价格与新能源消纳的影响。",
    config: {
      baseScenario: "新能源高波动场景",
      variableParameters: [defaultSweepConfigs[4]],
      fixedParameters: { storageEnabled: true }
    }
  },
  {
    id: "market-power",
    name: "市场力策略报价实验",
    description: "考察策略报价和容量扣留对价格及市场力风险的影响。",
    config: {
      baseScenario: "高负荷紧张场景",
      variableParameters: [defaultSweepConfigs[5]],
      fixedParameters: { marketPowerStudy: true }
    }
  },
  {
    id: "multi-factor-flexibility",
    name: "新能源-储能-负荷组合实验",
    description: "同时扫描新能源占比、储能容量和负荷水平，观察价格、消纳和系统成本联动变化。",
    config: {
      baseScenario: "新能源高波动场景",
      variableParameters: [defaultSweepConfigs[0], defaultSweepConfigs[4], defaultSweepConfigs[6]],
      fixedParameters: { multiFactorStudy: true }
    }
  }
];

export function buildExperimentConfigFromTemplate(
  template: ExperimentTemplate,
  overrides: Partial<Pick<ExperimentConfig, "experimentName" | "researchQuestion" | "notes">> = {}
): ExperimentConfig {
  return {
    id: `${template.id}-${Date.now()}`,
    experimentName: overrides.experimentName ?? template.name,
    researchQuestion: overrides.researchQuestion ?? template.description,
    baseScenario: template.config.baseScenario,
    variableParameters: template.config.variableParameters,
    fixedParameters: template.config.fixedParameters,
    notes: overrides.notes ?? ""
  };
}

export function runExperiment(
  config: ExperimentConfig,
  baseInput: SimulationInput
): ExperimentRunRecord {
  const sweepConfigs: ParameterSweepConfig[] = config.variableParameters.length > 0
    ? config.variableParameters
    : [defaultSweepConfigs[0]];
  const results = runParameterSweep(baseInput, sweepConfigs, defaultRuleConfig);
  const clearingResult = runMarketClearing(baseInput, defaultRuleConfig);
  const marketPower = computeMarketPowerMetrics(baseInput);
  const renewableMetrics = computeRenewableMetrics(clearingResult.participants);

  return {
    experimentId: config.id,
    experimentName: config.experimentName,
    researchQuestion: config.researchQuestion,
    runAt: new Date().toISOString(),
    baseScenario: config.baseScenario,
    variableParameters: config.variableParameters,
    fixedParameters: {
      ...config.fixedParameters,
      combinationCount: countParameterCombinations(sweepConfigs)
    },
    notes: config.notes,
    results,
    resultSnapshot: {
      baseInput,
      appliedRuleConfig: defaultRuleConfig,
      clearingResult,
      marketPower,
      renewableMetrics
    },
    chartData: createChartData(results)
  };
}

export function summarizeExperimentRecord(record: ExperimentRunRecord): ExperimentRunSummary {
  return {
    experimentId: record.experimentId,
    experimentName: record.experimentName,
    researchQuestion: record.researchQuestion,
    runAt: record.runAt,
    baseScenario: record.baseScenario,
    parameterLabel: record.variableParameters.map((item) => item.label).join(" + "),
    resultCount: record.results.length,
    sourceVersion: record.sourceVersion
  };
}
