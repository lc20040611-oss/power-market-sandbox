import type {
  RuleConfig,
  ScenarioConfig
} from "./types";

export const STORAGE_KEYS = {
  marketInput: "power-market-last-input",
  marketResult: "power-market-last-result",
  ruleConfig: "power-market-rule-config",
  experimentSummaries: "power-market-experiment-summaries",
  activeExperimentRecord: "power-market-active-experiment-record",
  selectedExperimentId: "power-market-selected-experiment-id"
} as const;

export const defaultRuleConfig: RuleConfig = {
  clearingMechanism: "uniformPrice",
  priceCap: 1500,
  priceFloor: 0,
  enableDeviationPenalty: false,
  deviationTolerance: 0.05,
  deviationPenaltyRate: 80,
  renewablePriority: false,
  curtailmentPenalty: 40,
  renewableSubsidy: 0,
  enableCapacityPayment: false,
  capacityPaymentRate: 30
};

export const ruleTemplates: ScenarioConfig[] = [
  {
    id: "baseline",
    name: "基准统一出清价",
    ruleConfig: { ...defaultRuleConfig }
  },
  {
    id: "renewable-priority",
    name: "新能源优先出清",
    ruleConfig: {
      ...defaultRuleConfig,
      renewablePriority: true,
      renewableSubsidy: 35,
      curtailmentPenalty: 80
    }
  },
  {
    id: "high-deviation",
    name: "高偏差惩罚",
    ruleConfig: {
      ...defaultRuleConfig,
      enableDeviationPenalty: true,
      deviationTolerance: 0.03,
      deviationPenaltyRate: 160
    }
  },
  {
    id: "capacity-payment",
    name: "容量补偿机制",
    ruleConfig: {
      ...defaultRuleConfig,
      enableCapacityPayment: true,
      capacityPaymentRate: 45
    }
  },
  {
    id: "pay-as-bid",
    name: "按报价支付机制",
    ruleConfig: {
      ...defaultRuleConfig,
      clearingMechanism: "payAsBid"
    }
  }
];

export function clampPrice(value: number, config: RuleConfig) {
  return Math.min(config.priceCap, Math.max(config.priceFloor, value));
}
