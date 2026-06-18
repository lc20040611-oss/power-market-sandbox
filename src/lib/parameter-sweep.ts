import { runMarketClearing } from "./market-clearing";
import { computeMarketPowerMetrics } from "./market-power";
import { computeRenewableMetrics } from "./renewables";
import { defaultRuleConfig } from "./rule-config";
import { simulateStorageOperation } from "./storage";
import type {
  MarketParticipant,
  ParameterCombination,
  ParameterSweepConfig,
  ParameterSweepResult,
  RuleConfig,
  SimulationInput,
  StorageAsset,
  SweepParameterKey
} from "./types";

const storagePriceCurve = [180, 170, 165, 190, 260, 320, 410, 450];
const storageLoadCurve = [420, 400, 390, 430, 500, 540, 580, 560];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function cloneParticipants(participants: MarketParticipant[]) {
  return participants.map((participant) => ({
    ...participant,
    periodData: participant.periodData?.map((item) => ({ ...item })),
    storageOptimization: participant.storageOptimization
      ? { ...participant.storageOptimization }
      : undefined
  }));
}

function cloneInput(input: SimulationInput): SimulationInput {
  return {
    ...input,
    participants: cloneParticipants(input.participants),
    timePeriods: input.timePeriods?.map((period) => ({ ...period }))
  };
}

function applyRenewableShare(input: SimulationInput, share: number): SimulationInput {
  const participants = cloneParticipants(input.participants);
  const targetRenewable = input.loadDemand * share;
  const renewableParticipants = participants.filter((participant) => participant.type === "新能源");
  const thermalParticipants = participants.filter((participant) => participant.type === "火电");
  const currentRenewable = renewableParticipants.reduce((sum, participant) => sum + participant.declaredQuantity, 0);
  const renewableFactor = currentRenewable > 0 ? targetRenewable / currentRenewable : 1;

  renewableParticipants.forEach((participant) => {
    participant.declaredQuantity = round(participant.declaredQuantity * renewableFactor);
    participant.availableOutput = round((participant.availableOutput ?? participant.declaredQuantity) * renewableFactor);
    participant.forecastOutput = round((participant.forecastOutput ?? participant.declaredQuantity) * renewableFactor);
    participant.actualQuantity = round((participant.actualQuantity ?? participant.declaredQuantity) * renewableFactor);
  });

  const remainingDemand = Math.max(
    0,
    input.loadDemand - renewableParticipants.reduce((sum, participant) => sum + participant.declaredQuantity, 0)
  );
  const currentThermal = thermalParticipants.reduce((sum, participant) => sum + participant.declaredQuantity, 0);
  const thermalFactor = currentThermal > 0 ? remainingDemand / currentThermal : 1;

  thermalParticipants.forEach((participant) => {
    participant.declaredQuantity = round(participant.declaredQuantity * thermalFactor);
    participant.actualQuantity = round((participant.actualQuantity ?? participant.declaredQuantity) * thermalFactor);
    participant.contractQuantity = round((participant.contractQuantity ?? 0) * thermalFactor);
  });

  return { ...input, participants };
}

function applyContractRatio(input: SimulationInput, ratio: number): SimulationInput {
  return {
    ...input,
    participants: cloneParticipants(input.participants).map((participant) => ({
      ...participant,
      contractQuantity: round(participant.declaredQuantity * ratio)
    }))
  };
}

function applyStorageCapacity(input: SimulationInput, capacity: number): SimulationInput {
  return {
    ...input,
    participants: cloneParticipants(input.participants).map((participant) =>
      participant.type === "储能"
        ? {
            ...participant,
            storageCapacity: capacity,
            declaredQuantity: capacity > 0 ? Math.max(participant.declaredQuantity, capacity * 0.2) : 0,
            chargePower: capacity > 0 ? Math.max(20, capacity * 0.15) : 0,
            dischargePower: capacity > 0 ? Math.max(20, capacity * 0.15) : 0,
            actualQuantity: capacity > 0 ? Math.max(participant.actualQuantity ?? 0, capacity * 0.15) : 0
          }
        : participant
    )
  };
}

function applyStrategyBid(input: SimulationInput, strategy: string): SimulationInput {
  return {
    ...input,
    participants: cloneParticipants(input.participants).map((participant) => {
      if (participant.type !== "火电") {
        return participant;
      }

      if (strategy === "成本报价") {
        return { ...participant, price: participant.marginalCost };
      }

      if (strategy === "加价 10%") {
        return { ...participant, price: round(participant.price * 1.1) };
      }

      if (strategy === "加价 20%") {
        return { ...participant, price: round(participant.price * 1.2) };
      }

      if (strategy === "容量扣留 10%") {
        return {
          ...participant,
          declaredQuantity: round(participant.declaredQuantity * 0.9),
          actualQuantity: round((participant.actualQuantity ?? participant.declaredQuantity) * 0.9)
        };
      }

      return {
        ...participant,
        price: round(participant.price * 1.15)
      };
    })
  };
}

function updateBySweepParameter(
  baseInput: SimulationInput,
  baseRuleConfig: RuleConfig,
  parameterKey: SweepParameterKey,
  parameterValue: number | string
) {
  let input = cloneInput(baseInput);
  let ruleConfig = { ...baseRuleConfig };

  if (parameterKey === "renewableShare") {
    input = applyRenewableShare(input, Number(parameterValue));
  }

  if (parameterKey === "contractRatio") {
    input = applyContractRatio(input, Number(parameterValue));
  }

  if (parameterKey === "deviationPenaltyRate") {
    ruleConfig = {
      ...ruleConfig,
      enableDeviationPenalty: Number(parameterValue) > 0,
      deviationPenaltyRate: Number(parameterValue) * 100
    };
  }

  if (parameterKey === "capacityPaymentRate") {
    ruleConfig = {
      ...ruleConfig,
      enableCapacityPayment: Number(parameterValue) > 0,
      capacityPaymentRate: Number(parameterValue)
    };
  }

  if (parameterKey === "storageCapacity") {
    input = applyStorageCapacity(input, Number(parameterValue));
  }

  if (parameterKey === "strategyBid") {
    input = applyStrategyBid(input, String(parameterValue));
  }

  if (parameterKey === "loadScale") {
    const scale = Number(parameterValue);
    input = {
      ...input,
      loadDemand: round(input.loadDemand * scale),
      timePeriods: input.timePeriods?.map((period) => ({
        ...period,
        loadDemand: round(period.loadDemand * scale)
      }))
    };
  }

  if (parameterKey === "priceCap") {
    ruleConfig = {
      ...ruleConfig,
      priceCap: Number(parameterValue)
    };
  }

  if (parameterKey === "renewableSubsidy") {
    ruleConfig = {
      ...ruleConfig,
      renewableSubsidy: Number(parameterValue)
    };
  }

  return { input, ruleConfig };
}

function computeStorageRevenue(input: SimulationInput) {
  const storageParticipant = input.participants.find(
    (participant) => participant.type === "储能" && (participant.storageCapacity ?? 0) > 0
  );
  if (!storageParticipant) {
    return 0;
  }

  const asset: StorageAsset = {
    participantId: storageParticipant.id,
    participantName: storageParticipant.name,
    storageCapacity: storageParticipant.storageCapacity ?? 0,
    chargePower: storageParticipant.chargePower ?? 0,
    dischargePower: storageParticipant.dischargePower ?? 0,
    roundTripEfficiency: storageParticipant.roundTripEfficiency ?? 0.9,
    initialSoc: storageParticipant.initialSoc ?? 0.5,
    minSoc: storageParticipant.minSoc ?? 0.1,
    maxSoc: storageParticipant.maxSoc ?? 0.95
  };

  return simulateStorageOperation(asset, storagePriceCurve, storageLoadCurve).netArbitrageRevenue;
}

function buildCombinationLabel(sweepConfigs: ParameterSweepConfig[], values: ParameterCombination) {
  return sweepConfigs
    .map((config) => `${config.label}=${String(values[config.parameterKey])}`)
    .join(" | ");
}

function buildCombinations(
  sweepConfigs: ParameterSweepConfig[],
  current: ParameterCombination = {},
  index = 0
): ParameterCombination[] {
  if (index >= sweepConfigs.length) {
    return [current];
  }

  const sweep = sweepConfigs[index];
  return sweep.values.flatMap((value) =>
    buildCombinations(sweepConfigs, { ...current, [sweep.parameterKey]: value }, index + 1)
  );
}

export function runParameterSweep(
  baseInput: SimulationInput,
  sweepConfig: ParameterSweepConfig | ParameterSweepConfig[],
  baseRuleConfig: RuleConfig = defaultRuleConfig
): ParameterSweepResult[] {
  const sweepConfigs = Array.isArray(sweepConfig) ? sweepConfig : [sweepConfig];
  const combinations = buildCombinations(sweepConfigs);

  return combinations.map((parameterValues) => {
    let input = cloneInput(baseInput);
    let ruleConfig = { ...baseRuleConfig };

    sweepConfigs.forEach((config) => {
      const applied = updateBySweepParameter(
        input,
        ruleConfig,
        config.parameterKey,
        parameterValues[config.parameterKey]
      );
      input = applied.input;
      ruleConfig = applied.ruleConfig;
    });

    const clearingResult = runMarketClearing(input, ruleConfig);
    const renewableMetrics = computeRenewableMetrics(clearingResult.participants);
    const marketPower = computeMarketPowerMetrics(input);
    const primaryConfig = sweepConfigs[0];

    return {
      parameterKey: primaryConfig.parameterKey,
      parameterLabel: primaryConfig.label,
      parameterValue: parameterValues[primaryConfig.parameterKey],
      parameterValues,
      combinationLabel: buildCombinationLabel(sweepConfigs, parameterValues),
      clearingPrice: clearingResult.clearingPrice,
      customerPurchaseCost: clearingResult.customerPurchaseCost,
      totalGeneratorRevenue: clearingResult.totalGeneratorRevenue,
      totalSystemCost: clearingResult.totalSystemCost,
      socialWelfare: clearingResult.socialWelfare,
      renewableConsumptionRate: renewableMetrics.consumptionRate,
      curtailmentRate: renewableMetrics.curtailmentRate,
      storageRevenue: computeStorageRevenue(input),
      capacityPaymentTotal: clearingResult.capacityPaymentTotal,
      deviationPenaltyTotal: clearingResult.deviationPenaltyTotal,
      hhi: marketPower.hhi,
      rsi: marketPower.rsi,
      marketPowerRiskLevel: marketPower.riskLevel
    };
  });
}

export function getDefaultSweepConfigs(): ParameterSweepConfig[] {
  return [
    {
      parameterKey: "renewableShare",
      label: "新能源占比",
      values: [0.2, 0.4, 0.6, 0.8]
    },
    {
      parameterKey: "contractRatio",
      label: "中长期合约比例",
      values: [0.3, 0.6, 0.9]
    },
    {
      parameterKey: "deviationPenaltyRate",
      label: "偏差惩罚系数",
      values: [0, 0.1, 0.3, 0.5]
    },
    {
      parameterKey: "capacityPaymentRate",
      label: "容量补偿价格",
      values: [0, 50, 100, 150]
    },
    {
      parameterKey: "storageCapacity",
      label: "储能容量",
      values: [0, 100, 300, 500]
    },
    {
      parameterKey: "strategyBid",
      label: "发电企业策略报价",
      values: ["成本报价", "加价 10%", "加价 20%", "容量扣留 10%"]
    },
    {
      parameterKey: "loadScale",
      label: "负荷水平",
      values: [0.9, 1, 1.1]
    },
    {
      parameterKey: "priceCap",
      label: "价格上限",
      values: [800, 1200, 1500]
    },
    {
      parameterKey: "renewableSubsidy",
      label: "新能源补贴",
      values: [0, 30, 60]
    }
  ];
}

export function countParameterCombinations(sweepConfig: ParameterSweepConfig | ParameterSweepConfig[]) {
  const sweepConfigs = Array.isArray(sweepConfig) ? sweepConfig : [sweepConfig];
  return sweepConfigs.reduce((product, config) => product * config.values.length, 1);
}
