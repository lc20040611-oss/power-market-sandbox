import type { StorageAsset, StorageSimulationResult } from "./types";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function simulateStorageOperation(
  asset: StorageAsset,
  priceCurve: number[],
  loadCurve: number[]
): StorageSimulationResult {
  let soc = asset.initialSoc;
  const lowPrice = Math.min(...priceCurve);
  const highPrice = Math.max(...priceCurve);
  let chargeCost = 0;
  let dischargeRevenue = 0;
  let totalThroughput = 0;
  let peakLoadReduction = 0;
  const socSeries: Array<{ hour: string; soc: number }> = [];
  const powerSeries: Array<{ hour: string; chargePower: number; dischargePower: number }> = [];
  const priceSeries = priceCurve.map((price, index) => ({ hour: `T${index + 1}`, price }));

  priceCurve.forEach((price, index) => {
    let chargePower = 0;
    let dischargePower = 0;
    const hour = `T${index + 1}`;

    if (price <= lowPrice + (highPrice - lowPrice) * 0.25) {
      const chargeRoom = asset.maxSoc - soc;
      chargePower = Math.min(asset.chargePower, chargeRoom * asset.storageCapacity);
      soc += chargePower / asset.storageCapacity;
      chargeCost += chargePower * price;
      totalThroughput += chargePower;
    } else if (price >= lowPrice + (highPrice - lowPrice) * 0.75) {
      const availableDischarge = Math.max(0, soc - asset.minSoc) * asset.storageCapacity;
      dischargePower = Math.min(asset.dischargePower, availableDischarge);
      soc -= dischargePower / asset.storageCapacity;
      const effectiveDischarge = dischargePower * asset.roundTripEfficiency;
      dischargeRevenue += effectiveDischarge * price;
      totalThroughput += dischargePower;
      peakLoadReduction = Math.max(peakLoadReduction, Math.min(loadCurve[index] ?? 0, effectiveDischarge));
    }

    socSeries.push({ hour, soc: round(soc) });
    powerSeries.push({
      hour,
      chargePower: round(chargePower),
      dischargePower: round(dischargePower * asset.roundTripEfficiency)
    });
  });

  return {
    participantId: asset.participantId,
    participantName: asset.participantName,
    socSeries,
    powerSeries,
    priceSeries,
    chargeCost: round(chargeCost),
    dischargeRevenue: round(dischargeRevenue),
    netArbitrageRevenue: round(dischargeRevenue - chargeCost),
    equivalentCycles: round(totalThroughput / (2 * asset.storageCapacity)),
    socChange: round(soc - asset.initialSoc),
    peakLoadReduction: round(peakLoadReduction)
  };
}
