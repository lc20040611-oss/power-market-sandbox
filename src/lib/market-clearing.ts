import { clampPrice, defaultRuleConfig } from "./rule-config";
import type {
  ClearingResult,
  MarketParticipant,
  ParticipantClearingResult,
  RuleConfig,
  ScenarioComparisonResult,
  SimulationInput
} from "./types";

function round(value: number) {
  return Math.round(value * 100) / 100;
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

function buildParticipantResult(
  participant: MarketParticipant,
  awardedQuantity: number,
  marginalPrice: number,
  ruleConfig: RuleConfig,
  isMarginalUnit: boolean
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
  const totalCost = executedQuantity * participant.marginalCost;
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
    isMarginalUnit
  };
}

export function runMarketClearing(
  input: SimulationInput,
  config: RuleConfig = defaultRuleConfig
): ClearingResult {
  const sortedParticipants = sortParticipants(input.participants, config);
  let remainingDemand = input.loadDemand;
  let marginalRawPrice = config.priceFloor;
  let marginalIndex = -1;

  const dispatchDraft = sortedParticipants.map((participant, index) => {
    const awardedQuantity = Math.max(0, Math.min(participant.declaredQuantity, remainingDemand));

    if (awardedQuantity > 0) {
      remainingDemand -= awardedQuantity;
      marginalRawPrice = participant.price;
      marginalIndex = index;
    }

    return {
      participant,
      awardedQuantity
    };
  });

  const clearingPrice = clampPrice(marginalRawPrice, config);
  const participants = dispatchDraft.map(({ participant, awardedQuantity }, index) =>
    buildParticipantResult(
      participant,
      awardedQuantity,
      clearingPrice,
      config,
      index === marginalIndex && awardedQuantity > 0 && awardedQuantity < participant.declaredQuantity
    )
  );

  const totalClearedQuantity = round(
    participants.reduce((sum, participant) => sum + participant.awardedQuantity, 0)
  );
  const totalEnergyPayment = round(
    participants.reduce((sum, participant) => sum + participant.energyRevenue, 0)
  );
  const capacityPaymentTotal = round(
    participants.reduce((sum, participant) => sum + participant.capacityPayment, 0)
  );
  const renewableSubsidyTotal = round(
    participants.reduce((sum, participant) => sum + participant.renewableSubsidyRevenue, 0)
  );
  const deviationPenaltyTotal = round(
    participants.reduce((sum, participant) => sum + participant.deviationPenalty, 0)
  );
  const curtailmentPenaltyTotal = round(
    participants.reduce((sum, participant) => sum + participant.curtailmentPenaltyCost, 0)
  );
  const customerPurchaseCost = round(
    totalEnergyPayment + renewableSubsidyTotal + capacityPaymentTotal
  );
  const totalGeneratorRevenue = round(
    participants.reduce((sum, participant) => sum + participant.revenue, 0)
  );
  const totalVariableCost = round(
    participants.reduce((sum, participant) => sum + participant.totalCost, 0)
  );
  const totalSystemCost = round(totalVariableCost + renewableSubsidyTotal + capacityPaymentTotal);
  const socialWelfare = round(totalGeneratorRevenue - totalVariableCost);
  const renewableParticipants = participants.filter((participant) => participant.type === "新能源");
  const renewableDeclared = round(
    renewableParticipants.reduce((sum, participant) => sum + participant.declaredQuantity, 0)
  );
  const renewableAwardedQuantity = round(
    renewableParticipants.reduce((sum, participant) => sum + participant.awardedQuantity, 0)
  );
  const renewableCurtailmentQuantity = round(
    Math.max(0, renewableDeclared - renewableAwardedQuantity)
  );
  const renewableConsumptionRate =
    renewableDeclared > 0 ? round(renewableAwardedQuantity / renewableDeclared) : 0;

  return {
    clearingPrice: round(clearingPrice),
    totalClearedQuantity,
    customerPurchaseCost,
    totalGeneratorRevenue,
    totalSystemCost,
    socialWelfare,
    unmetDemand: round(Math.max(0, remainingDemand)),
    renewableAwardedQuantity,
    renewableConsumptionRate,
    renewableCurtailmentQuantity,
    capacityPaymentTotal,
    deviationPenaltyTotal,
    renewableSubsidyTotal,
    curtailmentPenaltyTotal,
    ruleConfig: config,
    participants
  };
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
