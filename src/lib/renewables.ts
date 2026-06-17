import type { ParticipantClearingResult, RenewableMetrics } from "./types";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeRenewableMetrics(
  participants: ParticipantClearingResult[]
): RenewableMetrics {
  const renewableParticipants = participants.filter((participant) => participant.type === "新能源");
  const totalForecastOutput = renewableParticipants.reduce(
    (sum, participant) => sum + (participant.forecastOutput ?? participant.declaredQuantity),
    0
  );
  const totalAvailableOutput = renewableParticipants.reduce(
    (sum, participant) => sum + (participant.availableOutput ?? participant.declaredQuantity),
    0
  );
  const totalClearedOutput = renewableParticipants.reduce(
    (sum, participant) => sum + participant.awardedQuantity,
    0
  );
  const totalCurtailedOutput = Math.max(0, totalAvailableOutput - totalClearedOutput);
  const subsidyAmount = renewableParticipants.reduce(
    (sum, participant) => sum + participant.renewableSubsidyRevenue,
    0
  );

  return {
    totalForecastOutput: round(totalForecastOutput),
    totalAvailableOutput: round(totalAvailableOutput),
    totalClearedOutput: round(totalClearedOutput),
    totalCurtailedOutput: round(totalCurtailedOutput),
    consumptionRate: totalAvailableOutput > 0 ? round(totalClearedOutput / totalAvailableOutput) : 0,
    curtailmentRate: totalAvailableOutput > 0 ? round(totalCurtailedOutput / totalAvailableOutput) : 0,
    subsidyAmount: round(subsidyAmount),
    participantMetrics: renewableParticipants.map((participant) => ({
      participantId: participant.id,
      participantName: participant.name,
      forecastOutput: round(participant.forecastOutput ?? participant.declaredQuantity),
      availableOutput: round(participant.availableOutput ?? participant.declaredQuantity),
      clearedOutput: round(participant.awardedQuantity),
      curtailedOutput: round(participant.curtailedOutput),
      revenue: round(participant.revenue)
    }))
  };
}
