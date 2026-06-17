import type { ContractSettlement, ParticipantClearingResult } from "./types";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeContractSettlements(
  participants: ParticipantClearingResult[]
): ContractSettlement[] {
  return participants.map((participant) => {
    const contractQuantity = participant.contractQuantity ?? 0;
    const contractPrice = participant.contractPrice ?? 0;
    const actualQuantity = participant.executedQuantity;
    const spotQuantity = actualQuantity - contractQuantity;
    const contractRevenue = contractQuantity * contractPrice;
    const spotSettlementAmount = spotQuantity * participant.settlementPrice;
    const totalRevenue =
      contractRevenue +
      spotSettlementAmount +
      participant.renewableSubsidyRevenue +
      participant.capacityPayment -
      participant.capacityPenalty -
      participant.deviationPenalty -
      participant.curtailmentPenaltyCost;
    const contractCoverageRate = actualQuantity > 0 ? contractQuantity / actualQuantity : 0;

    return {
      participantId: participant.id,
      participantName: participant.name,
      contractQuantity: round(contractQuantity),
      contractPrice: round(contractPrice),
      actualQuantity: round(actualQuantity),
      spotQuantity: round(spotQuantity),
      contractRevenue: round(contractRevenue),
      spotSettlementAmount: round(spotSettlementAmount),
      totalRevenue: round(totalRevenue),
      contractCoverageRate: round(contractCoverageRate)
    };
  });
}
