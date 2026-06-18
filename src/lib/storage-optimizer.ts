import type {
  MarketParticipant,
  StorageDispatchPlan,
  StorageDispatchStep,
  TimePeriodInput
} from "./types";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

type StorageTransition = {
  value: number;
  prevIndex: number;
  chargePower: number;
  dischargePower: number;
};

function getSocGrid(step: number) {
  const values: number[] = [];
  for (let soc = 0; soc <= 1 + 1e-9; soc += step) {
    values.push(round(Math.min(1, soc)));
  }
  return values;
}

export function optimizeStorageDispatch(
  participant: MarketParticipant,
  periods: TimePeriodInput[],
  referencePrices: number[]
): StorageDispatchPlan | null {
  if (
    participant.type !== "储能" ||
    !participant.storageCapacity ||
    !participant.chargePower ||
    !participant.dischargePower
  ) {
    return null;
  }

  const step = participant.storageOptimization?.socStep ?? 0.05;
  const targetFinalSoc = participant.storageOptimization?.targetFinalSoc ?? participant.initialSoc ?? 0.5;
  const objective = participant.storageOptimization?.objective ?? "arbitrage";
  const efficiency = participant.roundTripEfficiency ?? 0.9;
  const minSoc = participant.minSoc ?? 0.1;
  const maxSoc = participant.maxSoc ?? 0.95;
  const initialSoc = participant.initialSoc ?? 0.5;
  const capacity = participant.storageCapacity;
  const socGrid = getSocGrid(step).filter((soc) => soc >= minSoc - 1e-9 && soc <= maxSoc + 1e-9);
  const maxChargeDelta = Math.max(1, Math.round((participant.chargePower / capacity) / step));
  const maxDischargeDelta = Math.max(1, Math.round((participant.dischargePower / capacity) / step));

  const dp: StorageTransition[][] = periods.map(() =>
    socGrid.map(() => ({ value: Number.NEGATIVE_INFINITY, prevIndex: -1, chargePower: 0, dischargePower: 0 }))
  );
  const initIndex = socGrid.findIndex((soc) => Math.abs(soc - initialSoc) <= step / 2) || 0;

  dp[0][initIndex] = { value: 0, prevIndex: initIndex, chargePower: 0, dischargePower: 0 };

  for (let periodIndex = 1; periodIndex < periods.length; periodIndex += 1) {
    const price = referencePrices[periodIndex - 1] ?? referencePrices.at(-1) ?? participant.price;
    const loadBonus = objective === "peakShaving" ? periods[periodIndex - 1].loadDemand * 0.02 : 0;

    for (let prevIndex = 0; prevIndex < socGrid.length; prevIndex += 1) {
      const previousState = dp[periodIndex - 1][prevIndex];
      if (!Number.isFinite(previousState.value)) {
        continue;
      }

      for (let deltaSteps = -maxDischargeDelta; deltaSteps <= maxChargeDelta; deltaSteps += 1) {
        const nextIndex = prevIndex + deltaSteps;
        if (nextIndex < 0 || nextIndex >= socGrid.length) {
          continue;
        }

        const prevSoc = socGrid[prevIndex];
        const nextSoc = socGrid[nextIndex];
        if (nextSoc < minSoc - 1e-9 || nextSoc > maxSoc + 1e-9) {
          continue;
        }

        const deltaSoc = round(nextSoc - prevSoc);
        const chargePower = deltaSoc > 0 ? Math.min(participant.chargePower, deltaSoc * capacity) : 0;
        const dischargePower =
          deltaSoc < 0 ? Math.min(participant.dischargePower, Math.abs(deltaSoc) * capacity * efficiency) : 0;
        const stepValue = dischargePower * (price + loadBonus) - chargePower * price;
        const candidateValue = previousState.value + stepValue;

        if (candidateValue > dp[periodIndex][nextIndex].value) {
          dp[periodIndex][nextIndex] = {
            value: candidateValue,
            prevIndex,
            chargePower: round(chargePower),
            dischargePower: round(dischargePower)
          };
        }
      }
    }
  }

  const targetIndex =
    socGrid.findIndex((soc) => Math.abs(soc - targetFinalSoc) <= step / 2) >= 0
      ? socGrid.findIndex((soc) => Math.abs(soc - targetFinalSoc) <= step / 2)
      : socGrid.reduce((bestIndex, soc, index) =>
          Math.abs(soc - targetFinalSoc) < Math.abs(socGrid[bestIndex] - targetFinalSoc) ? index : bestIndex
        , 0);

  let bestIndex = targetIndex;
  let bestValue = dp[periods.length - 1][bestIndex]?.value ?? Number.NEGATIVE_INFINITY;
  if (!Number.isFinite(bestValue)) {
    bestIndex = dp[periods.length - 1].reduce(
      (best, current, index, states) => (current.value > states[best].value ? index : best),
      0
    );
  }

  const reversedSteps: StorageDispatchStep[] = [];
  let currentIndex = bestIndex;

  for (let periodIndex = periods.length - 1; periodIndex >= 0; periodIndex -= 1) {
    const transition = dp[periodIndex][currentIndex];
    const prevIndex = periodIndex === 0 ? currentIndex : transition.prevIndex;
    const socStart = socGrid[prevIndex];
    const socEnd = socGrid[currentIndex];
    reversedSteps.push({
      periodId: periods[periodIndex].id,
      periodLabel: periods[periodIndex].label,
      chargePower: transition.chargePower,
      dischargePower: transition.dischargePower,
      socStart: round(socStart),
      socEnd: round(socEnd),
      referencePrice: round(referencePrices[periodIndex] ?? referencePrices.at(-1) ?? participant.price)
    });
    currentIndex = prevIndex;
  }

  const steps = reversedSteps.reverse();
  const chargeCost = round(
    steps.reduce((sum, stepItem) => sum + stepItem.chargePower * stepItem.referencePrice, 0)
  );
  const dischargeRevenue = round(
    steps.reduce((sum, stepItem) => sum + stepItem.dischargePower * stepItem.referencePrice, 0)
  );
  const totalThroughput = steps.reduce(
    (sum, stepItem) => sum + stepItem.chargePower + stepItem.dischargePower,
    0
  );
  const peakLoadReduction = round(Math.max(...steps.map((stepItem) => stepItem.dischargePower), 0));

  return {
    participantId: participant.id,
    participantName: participant.name,
    steps,
    chargeCost,
    dischargeRevenue,
    netArbitrageRevenue: round(dischargeRevenue - chargeCost),
    equivalentCycles: round(totalThroughput / (2 * capacity)),
    peakLoadReduction
  };
}
