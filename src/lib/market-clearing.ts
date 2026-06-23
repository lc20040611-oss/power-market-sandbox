import { clampPrice, defaultRuleConfig } from "./rule-config";
import { normalizeRuleConfig, normalizeSimulationInput } from "./runtime-guards";
import { optimizeStorageDispatch } from "./storage-optimizer";
import type {
  ClearingResult,
  MarketParticipant,
  ParticipantClearingResult,
  PeriodClearingResult,
  PeriodParticipantResult,
  RuleConfig,
  ScenarioComparisonResult,
  SimulationInput,
  StorageDispatchPlan,
  TimePeriodInput
} from "./types";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

const DEFAULT_LOAD_PROFILE = [0.88, 0.82, 0.95, 1.04, 1.12, 1.05];
const DEFAULT_RENEWABLE_PROFILE = [0.52, 0.68, 0.9, 0.96, 0.72, 0.48];
const DEFAULT_THERMAL_PROFILE = [0.94, 0.9, 0.96, 1, 1.03, 1];

function fitProfile(profile: number[], targetLength: number) {
  if (profile.length === targetLength) {
    return profile;
  }

  return Array.from({ length: targetLength }, (_, index) => profile[index % profile.length]);
}

function sortParticipants(participants: MarketParticipant[], ruleConfig: RuleConfig) {
  return [...participants].sort((left, right) => {
    if (left.price !== right.price) {
      return left.price - right.price;
    }

    if (ruleConfig.renewablePriority && left.type !== right.type) {
      if (left.type === "新能源") return -1;
      if (right.type === "新能源") return 1;
    }

    return left.name.localeCompare(right.name, "zh-CN");
  });
}

function scaleProfile(value: number, profile: number[]) {
  const average = profile.reduce((sum, item) => sum + item, 0) / profile.length;
  return profile.map((item) => round((value * item) / average));
}

function normalizeTimePeriods(input: SimulationInput): TimePeriodInput[] {
  if (input.timePeriods && input.timePeriods.length > 0) {
    return input.timePeriods;
  }

  return scaleProfile(input.loadDemand, DEFAULT_LOAD_PROFILE).map((loadDemand, index) => ({
    id: `T${index + 1}`,
    label: `T${index + 1}`,
    loadDemand,
    priceHint: 0
  }));
}

function buildParticipantProfile(participant: MarketParticipant, periods: TimePeriodInput[]) {
  const profile =
    participant.type === "新能源"
      ? fitProfile(DEFAULT_RENEWABLE_PROFILE, periods.length)
      : participant.type === "储能"
        ? new Array(periods.length).fill(1)
        : fitProfile(DEFAULT_THERMAL_PROFILE, periods.length);

  return {
    declared: scaleProfile(participant.declaredQuantity, profile),
    actual: scaleProfile(participant.actualQuantity ?? participant.declaredQuantity, profile),
    forecast: scaleProfile(participant.forecastOutput ?? participant.declaredQuantity, profile),
    available: scaleProfile(participant.availableOutput ?? participant.declaredQuantity, profile),
    contract: scaleProfile(participant.contractQuantity ?? 0, profile)
  };
}

function getParticipantPeriodInput(
  participant: MarketParticipant,
  periods: TimePeriodInput[],
  period: TimePeriodInput,
  periodIndex: number
) {
  const explicit = participant.periodData?.find((item) => item.periodId === period.id);
  const profile = buildParticipantProfile(participant, periods);

  return {
    price: explicit?.price ?? participant.price,
    declaredQuantity: explicit?.declaredQuantity ?? profile.declared[periodIndex],
    actualQuantity: explicit?.actualQuantity ?? profile.actual[periodIndex],
    forecastOutput: explicit?.forecastOutput ?? profile.forecast[periodIndex],
    availableOutput: explicit?.availableOutput ?? profile.available[periodIndex],
    contractQuantity: profile.contract[periodIndex]
  };
}

function buildParticipantResult(
  participant: MarketParticipant,
  awardedQuantity: number,
  marginalPrice: number,
  ruleConfig: RuleConfig,
  isMarginalUnit: boolean,
  storageChargeQuantity = 0,
  storageDischargeQuantity = awardedQuantity,
  storageSocStart?: number,
  storageSocEnd?: number
): ParticipantClearingResult {
  const executedQuantity = participant.actualQuantity ?? awardedQuantity;
  const contractQuantity = participant.contractQuantity ?? 0;
  const contractPrice = participant.contractPrice ?? 0;
  const settlementPrice =
    ruleConfig.clearingMechanism === "uniformPrice"
      ? marginalPrice
      : clampPrice(participant.price, ruleConfig);
  const spotQuantity = executedQuantity - contractQuantity;
  const contractRevenue = contractQuantity * contractPrice;
  const spotSettlementAmount = spotQuantity * settlementPrice;
  const energyRevenue = awardedQuantity * settlementPrice;
  const renewableSubsidyRevenue =
    participant.type === "新能源" ? executedQuantity * ruleConfig.renewableSubsidy : 0;
  const capacityPayment =
    ruleConfig.enableCapacityPayment ? participant.declaredQuantity * ruleConfig.capacityPaymentRate : 0;
  const capacityPenalty =
    ruleConfig.enableCapacityPayment
      ? Math.max(0, 1 - (participant.capacityAvailabilityRate ?? 1)) * capacityPayment * 0.5
      : 0;
  const toleranceQuantity = participant.declaredQuantity * ruleConfig.deviationTolerance;
  const deviationQuantity = Math.max(0, Math.abs(participant.declaredQuantity - executedQuantity) - toleranceQuantity);
  const deviationPenalty =
    ruleConfig.enableDeviationPenalty ? deviationQuantity * ruleConfig.deviationPenaltyRate : 0;
  const renewableCurtailment =
    participant.type === "新能源"
      ? Math.max(0, (participant.availableOutput ?? participant.declaredQuantity) - awardedQuantity)
      : 0;
  const curtailmentPenaltyCost = renewableCurtailment * ruleConfig.curtailmentPenalty;
  const storageChargeCost = storageChargeQuantity * settlementPrice;
  const totalCost = executedQuantity * participant.marginalCost + storageChargeCost;
  const totalRevenue =
    contractRevenue +
    spotSettlementAmount +
    renewableSubsidyRevenue +
    capacityPayment -
    capacityPenalty -
    deviationPenalty -
    curtailmentPenaltyCost;
  const profit = totalRevenue - totalCost;
  const contractCoverageRate = executedQuantity > 0 ? contractQuantity / executedQuantity : 0;

  return {
    ...participant,
    awardedQuantity: round(awardedQuantity),
    executedQuantity: round(executedQuantity),
    clearedOutput: round(awardedQuantity),
    curtailedOutput: round(renewableCurtailment),
    settlementPrice: round(settlementPrice),
    energyRevenue: round(energyRevenue),
    contractRevenue: round(contractRevenue),
    spotQuantity: round(spotQuantity),
    spotSettlementAmount: round(spotSettlementAmount),
    totalRevenue: round(totalRevenue),
    contractCoverageRate: round(contractCoverageRate),
    renewableSubsidyRevenue: round(renewableSubsidyRevenue),
    capacityPayment: round(capacityPayment),
    capacityPenalty: round(capacityPenalty),
    deviationPenalty: round(deviationPenalty),
    curtailmentPenaltyCost: round(curtailmentPenaltyCost),
    revenue: round(totalRevenue),
    totalCost: round(totalCost),
    profit: round(profit),
    isMarginalUnit,
    storageChargeQuantity: round(storageChargeQuantity),
    storageDischargeQuantity: round(storageDischargeQuantity),
    storageSocStart: storageSocStart === undefined ? undefined : round(storageSocStart),
    storageSocEnd: storageSocEnd === undefined ? undefined : round(storageSocEnd)
  };
}

function aggregateParticipantResults(
  periodResults: PeriodClearingResult[],
  participantTemplate: MarketParticipant[]
): ParticipantClearingResult[] {
  const aggregates = new Map<string, ParticipantClearingResult>();

  for (const periodResult of periodResults) {
    for (const participant of periodResult.participants) {
      const current = aggregates.get(participant.id);
      if (!current) {
        aggregates.set(participant.id, { ...participant });
        continue;
      }

      current.contractQuantity = round((current.contractQuantity ?? 0) + (participant.contractQuantity ?? 0));
      current.actualQuantity = round((current.actualQuantity ?? 0) + (participant.actualQuantity ?? 0));
      current.availableOutput = round((current.availableOutput ?? 0) + (participant.availableOutput ?? 0));
      current.forecastOutput = round((current.forecastOutput ?? 0) + (participant.forecastOutput ?? 0));
      current.declaredQuantity = round(current.declaredQuantity + participant.declaredQuantity);
      current.awardedQuantity = round(current.awardedQuantity + participant.awardedQuantity);
      current.executedQuantity = round(current.executedQuantity + participant.executedQuantity);
      current.clearedOutput = round(current.clearedOutput + participant.clearedOutput);
      current.curtailedOutput = round(current.curtailedOutput + participant.curtailedOutput);
      current.energyRevenue = round(current.energyRevenue + participant.energyRevenue);
      current.contractRevenue = round(current.contractRevenue + participant.contractRevenue);
      current.spotQuantity = round(current.spotQuantity + participant.spotQuantity);
      current.spotSettlementAmount = round(current.spotSettlementAmount + participant.spotSettlementAmount);
      current.totalRevenue = round(current.totalRevenue + participant.totalRevenue);
      current.renewableSubsidyRevenue = round(current.renewableSubsidyRevenue + participant.renewableSubsidyRevenue);
      current.capacityPayment = round(current.capacityPayment + participant.capacityPayment);
      current.capacityPenalty = round(current.capacityPenalty + participant.capacityPenalty);
      current.deviationPenalty = round(current.deviationPenalty + participant.deviationPenalty);
      current.curtailmentPenaltyCost = round(current.curtailmentPenaltyCost + participant.curtailmentPenaltyCost);
      current.revenue = round(current.revenue + participant.revenue);
      current.totalCost = round(current.totalCost + participant.totalCost);
      current.profit = round(current.profit + participant.profit);
      current.storageChargeQuantity = round(
        (current.storageChargeQuantity ?? 0) + (participant.storageChargeQuantity ?? 0)
      );
      current.storageDischargeQuantity = round(
        (current.storageDischargeQuantity ?? 0) + (participant.storageDischargeQuantity ?? 0)
      );
      current.settlementPrice = round(
        current.awardedQuantity > 0
          ? (current.energyRevenue / current.awardedQuantity)
          : participant.settlementPrice
      );
      current.contractCoverageRate = round(
        current.executedQuantity > 0 ? current.contractQuantity! / current.executedQuantity : 0
      );
      current.isMarginalUnit = current.isMarginalUnit || participant.isMarginalUnit;
    }
  }

  return participantTemplate
    .map((participant) => aggregates.get(participant.id))
    .filter((participant): participant is ParticipantClearingResult => Boolean(participant));
}

function runSinglePeriodClearing(
  baseParticipants: MarketParticipant[],
  periods: TimePeriodInput[],
  period: TimePeriodInput,
  periodIndex: number,
  config: RuleConfig,
  storagePlans: StorageDispatchPlan[]
): PeriodClearingResult {
  const storagePlanMap = new Map(
    storagePlans.map((plan) => [plan.participantId, plan.steps.find((step) => step.periodId === period.id)])
  );
  const participants = baseParticipants.map((participant) => {
    const periodInput = getParticipantPeriodInput(participant, periods, period, periodIndex);
    const storageStep = storagePlanMap.get(participant.id);

    if (participant.type === "储能" && storageStep) {
      return {
        ...participant,
        price: periodInput.price,
        declaredQuantity: storageStep.dischargePower,
        actualQuantity: storageStep.dischargePower,
        contractQuantity: 0
      };
    }

    return {
      ...participant,
      price: periodInput.price,
      declaredQuantity: periodInput.declaredQuantity,
      actualQuantity: periodInput.actualQuantity,
      forecastOutput: periodInput.forecastOutput,
      availableOutput: periodInput.availableOutput,
      contractQuantity: periodInput.contractQuantity
    };
  });

  const storageChargingLoad = storagePlans.reduce((sum, plan) => {
    const stepItem = plan.steps.find((step) => step.periodId === period.id);
    return sum + (stepItem?.chargePower ?? 0);
  }, 0);

  const sortedParticipants = sortParticipants(participants, config);
  const adjustedDemand = period.loadDemand + storageChargingLoad;
  let remainingDemand = adjustedDemand;
  let marginalRawPrice = config.priceFloor;
  let marginalIndex = -1;

  const dispatchDraft = sortedParticipants.map((participant, index) => {
    const awardedQuantity = Math.max(0, Math.min(participant.declaredQuantity, remainingDemand));

    if (awardedQuantity > 0) {
      remainingDemand -= awardedQuantity;
      marginalRawPrice = participant.price;
      marginalIndex = index;
    }

    return { participant, awardedQuantity };
  });

  const clearingPrice = clampPrice(marginalRawPrice, config);
  const periodParticipants: PeriodParticipantResult[] = dispatchDraft.map(({ participant, awardedQuantity }, index) => {
    const storageStep = storagePlanMap.get(participant.id);
    const result = buildParticipantResult(
      participant,
      awardedQuantity,
      clearingPrice,
      config,
      index === marginalIndex && awardedQuantity > 0 && awardedQuantity < participant.declaredQuantity,
      storageStep?.chargePower ?? 0,
      storageStep?.dischargePower ?? awardedQuantity,
      storageStep?.socStart,
      storageStep?.socEnd
    );

    return {
      ...result,
      periodId: period.id,
      periodLabel: period.label
    };
  });

  return {
    periodId: period.id,
    periodLabel: period.label,
    loadDemand: round(adjustedDemand),
    baseLoadDemand: round(period.loadDemand),
    storageChargingLoad: round(storageChargingLoad),
    storageDischargingSupply: round(
      storagePlans.reduce((sum, plan) => {
        const stepItem = plan.steps.find((step) => step.periodId === period.id);
        return sum + (stepItem?.dischargePower ?? 0);
      }, 0)
    ),
    clearingPrice: round(clearingPrice),
    totalClearedQuantity: round(periodParticipants.reduce((sum, participant) => sum + participant.awardedQuantity, 0)),
    unmetDemand: round(Math.max(0, remainingDemand)),
    participants: periodParticipants
  };
}

function buildReferencePriceCurve(input: SimulationInput, config: RuleConfig, periods: TimePeriodInput[]) {
  return periods.map((period, periodIndex) =>
    runSinglePeriodClearing(input.participants, periods, period, periodIndex, config, []).clearingPrice
  );
}

function aggregateClearingResult(
  input: SimulationInput,
  config: RuleConfig,
  periodResults: PeriodClearingResult[],
  storageDispatchPlans: StorageDispatchPlan[]
): ClearingResult {
  const participants = aggregateParticipantResults(periodResults, input.participants);
  const totalClearedQuantity = round(periodResults.reduce((sum, period) => sum + period.totalClearedQuantity, 0));
  const weightedPriceDenominator = periodResults.reduce((sum, period) => sum + period.totalClearedQuantity, 0);
  const clearingPrice = weightedPriceDenominator
    ? round(
        periodResults.reduce((sum, period) => sum + period.clearingPrice * period.totalClearedQuantity, 0) /
          weightedPriceDenominator
      )
    : 0;
  const totalEnergyPayment = round(participants.reduce((sum, participant) => sum + participant.energyRevenue, 0));
  const capacityPaymentTotal = round(participants.reduce((sum, participant) => sum + participant.capacityPayment, 0));
  const renewableSubsidyTotal = round(
    participants.reduce((sum, participant) => sum + participant.renewableSubsidyRevenue, 0)
  );
  const deviationPenaltyTotal = round(
    participants.reduce((sum, participant) => sum + participant.deviationPenalty, 0)
  );
  const curtailmentPenaltyTotal = round(
    participants.reduce((sum, participant) => sum + participant.curtailmentPenaltyCost, 0)
  );
  const customerPurchaseCost = round(totalEnergyPayment + renewableSubsidyTotal + capacityPaymentTotal);
  const totalGeneratorRevenue = round(participants.reduce((sum, participant) => sum + participant.revenue, 0));
  const totalVariableCost = round(participants.reduce((sum, participant) => sum + participant.totalCost, 0));
  const totalSystemCost = round(totalVariableCost + renewableSubsidyTotal + capacityPaymentTotal);
  const socialWelfare = round(totalGeneratorRevenue - totalVariableCost);
  const renewableParticipants = participants.filter((participant) => participant.type === "新能源");
  const renewableAvailable = round(
    renewableParticipants.reduce((sum, participant) => sum + (participant.availableOutput ?? participant.declaredQuantity), 0)
  );
  const renewableAwardedQuantity = round(
    renewableParticipants.reduce((sum, participant) => sum + participant.awardedQuantity, 0)
  );
  const renewableCurtailmentQuantity = round(
    renewableParticipants.reduce((sum, participant) => sum + participant.curtailedOutput, 0)
  );
  const renewableConsumptionRate =
    renewableAvailable > 0 ? round(renewableAwardedQuantity / renewableAvailable) : 0;

  return {
    clearingPrice,
    totalClearedQuantity,
    customerPurchaseCost,
    totalGeneratorRevenue,
    totalSystemCost,
    socialWelfare,
    unmetDemand: round(periodResults.reduce((sum, period) => sum + period.unmetDemand, 0)),
    renewableAwardedQuantity,
    renewableConsumptionRate,
    renewableCurtailmentQuantity,
    capacityPaymentTotal,
    deviationPenaltyTotal,
    renewableSubsidyTotal,
    curtailmentPenaltyTotal,
    ruleConfig: config,
    participants,
    periodResults,
    storageDispatchPlans,
    isMultiPeriod: periodResults.length > 1
  };
}

export function runMarketClearing(
  input: SimulationInput,
  config: RuleConfig = defaultRuleConfig
): ClearingResult {
  const safeInput = normalizeSimulationInput(input, input);
  const safeConfig = normalizeRuleConfig(config);
  const periods = normalizeTimePeriods(safeInput);
  const referencePrices = buildReferencePriceCurve(safeInput, safeConfig, periods);
  const storageDispatchPlans = safeInput.participants
    .map((participant) => optimizeStorageDispatch(participant, periods, referencePrices))
    .filter((plan): plan is StorageDispatchPlan => Boolean(plan));
  const periodResults = periods.map((period, periodIndex) =>
    runSinglePeriodClearing(safeInput.participants, periods, period, periodIndex, safeConfig, storageDispatchPlans)
  );

  return aggregateClearingResult(safeInput, safeConfig, periodResults, storageDispatchPlans);
}

export function compareScenarios(
  inputs: Array<{ scenarioId: string; scenarioName: string; input: SimulationInput; ruleConfig: RuleConfig }>
): ScenarioComparisonResult[] {
  return inputs.map(({ scenarioId, scenarioName, input, ruleConfig }) => {
    const result = runMarketClearing(input, ruleConfig);

    return {
      scenarioId,
      scenarioName,
      ruleConfig,
      clearingPrice: result.clearingPrice,
      totalClearedQuantity: result.totalClearedQuantity,
      customerPurchaseCost: result.customerPurchaseCost,
      totalGeneratorRevenue: result.totalGeneratorRevenue,
      totalSystemCost: result.totalSystemCost,
      socialWelfare: result.socialWelfare,
      renewableAwardedQuantity: result.renewableAwardedQuantity,
      renewableConsumptionRate: result.renewableConsumptionRate,
      renewableCurtailmentQuantity: result.renewableCurtailmentQuantity,
      capacityPaymentTotal: result.capacityPaymentTotal,
      deviationPenaltyTotal: result.deviationPenaltyTotal,
      participantProfits: result.participants.map((participant) => ({
        participantId: participant.id,
        participantName: participant.name,
        profit: participant.profit
      }))
    };
  });
}
