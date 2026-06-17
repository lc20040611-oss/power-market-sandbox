import type { CapacityPaymentResult, ParticipantClearingResult } from "./types";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeCapacityPayments(
  participants: ParticipantClearingResult[]
): CapacityPaymentResult[] {
  return participants.map((participant) => {
    const availableCapacity = participant.availableCapacity ?? participant.declaredQuantity;
    const capacityPrice =
      availableCapacity > 0 ? participant.capacityPayment / availableCapacity : 0;

    return {
      participantId: participant.id,
      participantName: participant.name,
      availableCapacity: round(availableCapacity),
      capacityPrice: round(capacityPrice),
      capacityRevenue: round(participant.capacityPayment),
      capacityAvailabilityRate: round(participant.capacityAvailabilityRate ?? 1),
      capacityPenalty: round(participant.capacityPenalty)
    };
  });
}
