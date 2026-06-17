import { defaultRuleConfig } from "./rule-config";
import { runMarketClearing } from "./market-clearing";
import type {
  MarketParticipant,
  MarketPowerMetrics,
  SimulationInput,
  StrategyBidScenario
} from "./types";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function applyStrategy(participants: MarketParticipant[], scenario: StrategyBidScenario) {
  return participants.map((participant) => {
    if (participant.type !== "火电") {
      return participant;
    }

    switch (scenario) {
      case "costBased":
        return { ...participant, price: participant.marginalCost };
      case "markup10":
        return { ...participant, price: round(participant.price * 1.1) };
      case "markup20":
        return { ...participant, price: round(participant.price * 1.2) };
      case "capacityWithholding":
        return { ...participant, declaredQuantity: round(participant.declaredQuantity * 0.85) };
      case "peakHourMarkup":
        return { ...participant, price: round(participant.price * 1.15) };
      default:
        return participant;
    }
  });
}

export function computeMarketPowerMetrics(input: SimulationInput): MarketPowerMetrics {
  const baseline = runMarketClearing(input, defaultRuleConfig);
  const clearedByParticipant = baseline.participants.map((participant) => ({
    participantId: participant.id,
    participantName: participant.name,
    quantity: participant.awardedQuantity
  }));
  const total = clearedByParticipant.reduce((sum, item) => sum + item.quantity, 0);
  const marketShares = clearedByParticipant
    .map((item) => ({
      participantId: item.participantId,
      participantName: item.participantName,
      marketShare: total > 0 ? item.quantity / total : 0
    }))
    .sort((left, right) => right.marketShare - left.marketShare);
  const hhi = round(marketShares.reduce((sum, item) => sum + (item.marketShare * 100) ** 2, 0));
  const cr3 = round(marketShares.slice(0, 3).reduce((sum, item) => sum + item.marketShare, 0));
  const cr5 = round(marketShares.slice(0, 5).reduce((sum, item) => sum + item.marketShare, 0));
  const thermalCapacity = input.participants
    .filter((participant) => participant.type === "火电")
    .reduce((sum, participant) => sum + participant.declaredQuantity, 0);
  const peakSupplier = marketShares[0]?.participantId;
  const pivotalQuantity =
    input.participants.find((participant) => participant.id === peakSupplier)?.declaredQuantity ?? 0;
  const rsi = round((thermalCapacity - pivotalQuantity) / input.loadDemand);
  const riskLevel = hhi > 2500 || rsi < 1 ? "高风险" : hhi > 1800 || rsi < 1.1 ? "中风险" : "低风险";

  const strategyScenarios: StrategyBidScenario[] = [
    "costBased",
    "markup10",
    "markup20",
    "capacityWithholding",
    "peakHourMarkup"
  ];

  return {
    hhi,
    cr3,
    cr5,
    rsi,
    riskLevel,
    marketShares: marketShares.map((item) => ({
      ...item,
      marketShare: round(item.marketShare)
    })),
    strategyScenarios: strategyScenarios.map((scenario) => {
      const strategyInput: SimulationInput = {
        ...input,
        participants: applyStrategy(input.participants, scenario)
      };
      const result = runMarketClearing(strategyInput, defaultRuleConfig);

      return {
        scenario,
        clearingPrice: result.clearingPrice,
        deltaFromBaseline: round(result.clearingPrice - baseline.clearingPrice)
      };
    })
  };
}
