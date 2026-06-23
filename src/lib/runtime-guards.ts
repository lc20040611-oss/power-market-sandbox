import { defaultRuleConfig } from "./rule-config";
import type {
  ClearingMechanism,
  ClearingResult,
  MarketParticipant,
  ParticipantClearingResult,
  ParticipantType,
  PeriodClearingResult,
  RuleConfig,
  SimulationInput,
  StorageDispatchPlan,
  TimePeriodInput
} from "./types";

const PARTICIPANT_TYPES: ParticipantType[] = ["火电", "新能源", "储能"];
const CLEARING_MECHANISMS: ClearingMechanism[] = ["uniformPrice", "payAsBid"];
const DEFAULT_PARTICIPANT: MarketParticipant = {
  id: "fallback-thermal-1",
  name: "火电 A",
  type: "火电",
  price: 300,
  declaredQuantity: 100,
  marginalCost: 220,
  contractQuantity: 0,
  contractPrice: 0,
  actualQuantity: 100,
  availableOutput: 100,
  forecastOutput: 100,
  availableCapacity: 100,
  capacityAvailabilityRate: 1
};

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function participantType(value: unknown, fallback: ParticipantType) {
  return PARTICIPANT_TYPES.includes(value as ParticipantType) ? (value as ParticipantType) : fallback;
}

function clearingMechanism(value: unknown, fallback: ClearingMechanism) {
  return CLEARING_MECHANISMS.includes(value as ClearingMechanism)
    ? (value as ClearingMechanism)
    : fallback;
}

function normalizeTimePeriod(period: Partial<TimePeriodInput> | undefined, fallback: TimePeriodInput, index: number): TimePeriodInput {
  return {
    id: textValue(period?.id, fallback.id || `T${index + 1}`),
    label: textValue(period?.label, fallback.label || `T${index + 1}`),
    loadDemand: finiteNumber(period?.loadDemand, fallback.loadDemand),
    priceHint: finiteNumber(period?.priceHint, fallback.priceHint ?? 0)
  };
}

export function normalizeRuleConfig(config: Partial<RuleConfig> | null | undefined): RuleConfig {
  return {
    clearingMechanism: clearingMechanism(config?.clearingMechanism, defaultRuleConfig.clearingMechanism),
    priceCap: finiteNumber(config?.priceCap, defaultRuleConfig.priceCap),
    priceFloor: finiteNumber(config?.priceFloor, defaultRuleConfig.priceFloor),
    enableDeviationPenalty: typeof config?.enableDeviationPenalty === "boolean"
      ? config.enableDeviationPenalty
      : defaultRuleConfig.enableDeviationPenalty,
    deviationTolerance: finiteNumber(config?.deviationTolerance, defaultRuleConfig.deviationTolerance),
    deviationPenaltyRate: finiteNumber(config?.deviationPenaltyRate, defaultRuleConfig.deviationPenaltyRate),
    renewablePriority: typeof config?.renewablePriority === "boolean"
      ? config.renewablePriority
      : defaultRuleConfig.renewablePriority,
    curtailmentPenalty: finiteNumber(config?.curtailmentPenalty, defaultRuleConfig.curtailmentPenalty),
    renewableSubsidy: finiteNumber(config?.renewableSubsidy, defaultRuleConfig.renewableSubsidy),
    enableCapacityPayment: typeof config?.enableCapacityPayment === "boolean"
      ? config.enableCapacityPayment
      : defaultRuleConfig.enableCapacityPayment,
    capacityPaymentRate: finiteNumber(config?.capacityPaymentRate, defaultRuleConfig.capacityPaymentRate)
  };
}

export function normalizeParticipant(
  participant: Partial<MarketParticipant> | null | undefined,
  fallback: MarketParticipant,
  index: number
): MarketParticipant {
  const declaredQuantity = finiteNumber(participant?.declaredQuantity, fallback.declaredQuantity);

  return {
    ...fallback,
    ...participant,
    id: textValue(participant?.id, fallback.id || `participant-${index + 1}`),
    name: textValue(participant?.name, fallback.name || `主体 ${index + 1}`),
    type: participantType(participant?.type, fallback.type),
    price: finiteNumber(participant?.price, fallback.price),
    declaredQuantity,
    marginalCost: finiteNumber(participant?.marginalCost, fallback.marginalCost),
    companyGroup: textValue(participant?.companyGroup, fallback.companyGroup ?? ""),
    contractQuantity: finiteNumber(participant?.contractQuantity, fallback.contractQuantity ?? 0),
    contractPrice: finiteNumber(participant?.contractPrice, fallback.contractPrice ?? 0),
    actualQuantity: finiteNumber(participant?.actualQuantity, fallback.actualQuantity ?? declaredQuantity),
    forecastOutput: finiteNumber(participant?.forecastOutput, fallback.forecastOutput ?? declaredQuantity),
    availableOutput: finiteNumber(participant?.availableOutput, fallback.availableOutput ?? declaredQuantity),
    storageCapacity: finiteNumber(participant?.storageCapacity, fallback.storageCapacity ?? 0),
    chargePower: finiteNumber(participant?.chargePower, fallback.chargePower ?? 0),
    dischargePower: finiteNumber(participant?.dischargePower, fallback.dischargePower ?? 0),
    roundTripEfficiency: finiteNumber(participant?.roundTripEfficiency, fallback.roundTripEfficiency ?? 0.9),
    initialSoc: finiteNumber(participant?.initialSoc, fallback.initialSoc ?? 0.5),
    minSoc: finiteNumber(participant?.minSoc, fallback.minSoc ?? 0.1),
    maxSoc: finiteNumber(participant?.maxSoc, fallback.maxSoc ?? 0.95),
    availableCapacity: finiteNumber(participant?.availableCapacity, fallback.availableCapacity ?? declaredQuantity),
    capacityAvailabilityRate: finiteNumber(
      participant?.capacityAvailabilityRate,
      fallback.capacityAvailabilityRate ?? 1
    ),
    periodData: Array.isArray(participant?.periodData)
      ? participant.periodData.map((item) => ({
          periodId: textValue(item?.periodId, ""),
          price: finiteNumber(item?.price, fallback.price),
          declaredQuantity: finiteNumber(item?.declaredQuantity, declaredQuantity),
          actualQuantity: finiteNumber(item?.actualQuantity, fallback.actualQuantity ?? declaredQuantity),
          forecastOutput: finiteNumber(item?.forecastOutput, fallback.forecastOutput ?? declaredQuantity),
          availableOutput: finiteNumber(item?.availableOutput, fallback.availableOutput ?? declaredQuantity)
        }))
      : fallback.periodData
  };
}

export function normalizeSimulationInput(
  input: Partial<SimulationInput> | null | undefined,
  fallback: SimulationInput
): SimulationInput {
  const baseParticipants =
    Array.isArray(fallback?.participants) && fallback.participants.length > 0
      ? fallback.participants
      : [DEFAULT_PARTICIPANT];
  const sourceParticipants = Array.isArray(input?.participants) && input.participants.length > 0
    ? input.participants
    : baseParticipants;
  const maxLength = Math.max(sourceParticipants.length, baseParticipants.length);
  const participants = Array.from({ length: maxLength }, (_, index) =>
    normalizeParticipant(
      sourceParticipants[index] as Partial<MarketParticipant> | undefined,
      baseParticipants[index] ?? baseParticipants[baseParticipants.length - 1],
      index
    )
  );

  const fallbackPeriods = fallback.timePeriods ?? [];
  const periods = Array.isArray(input?.timePeriods) && input.timePeriods.length > 0
    ? input.timePeriods.map((period, index) =>
        normalizeTimePeriod(period, fallbackPeriods[index] ?? {
          id: `T${index + 1}`,
          label: `T${index + 1}`,
          loadDemand: finiteNumber(input?.loadDemand, fallback.loadDemand),
          priceHint: 0
        }, index)
      )
    : fallbackPeriods.map((period, index) => normalizeTimePeriod(period, period, index));

  return {
    loadDemand: finiteNumber(input?.loadDemand, fallback.loadDemand),
    participants,
    timePeriods: periods.length > 0 ? periods : undefined
  };
}

function emptyParticipantResult(participant: MarketParticipant): ParticipantClearingResult {
  return {
    ...participant,
    awardedQuantity: 0,
    executedQuantity: finiteNumber(participant.actualQuantity, participant.declaredQuantity),
    clearedOutput: 0,
    curtailedOutput: 0,
    settlementPrice: finiteNumber(participant.price, 0),
    energyRevenue: 0,
    contractRevenue: 0,
    spotQuantity: 0,
    spotSettlementAmount: 0,
    totalRevenue: 0,
    contractCoverageRate: 0,
    renewableSubsidyRevenue: 0,
    capacityPayment: 0,
    capacityPenalty: 0,
    deviationPenalty: 0,
    curtailmentPenaltyCost: 0,
    revenue: 0,
    totalCost: 0,
    profit: 0,
    isMarginalUnit: false,
    storageChargeQuantity: 0,
    storageDischargeQuantity: 0,
    storageSocStart: participant.initialSoc,
    storageSocEnd: participant.initialSoc
  };
}

export function createEmptyClearingResult(
  ruleConfig: RuleConfig = defaultRuleConfig,
  participants: MarketParticipant[] = []
): ClearingResult {
  return {
    clearingPrice: 0,
    totalClearedQuantity: 0,
    customerPurchaseCost: 0,
    totalGeneratorRevenue: 0,
    totalSystemCost: 0,
    socialWelfare: 0,
    unmetDemand: 0,
    renewableAwardedQuantity: 0,
    renewableConsumptionRate: 0,
    renewableCurtailmentQuantity: 0,
    capacityPaymentTotal: 0,
    deviationPenaltyTotal: 0,
    renewableSubsidyTotal: 0,
    curtailmentPenaltyTotal: 0,
    ruleConfig,
    participants: participants.map(emptyParticipantResult),
    periodResults: [],
    storageDispatchPlans: [],
    isMultiPeriod: false
  };
}

export function normalizeClearingResult(
  result: Partial<ClearingResult> | null | undefined,
  fallbackInput: SimulationInput,
  fallbackRuleConfig: RuleConfig
): ClearingResult {
  const safeInput = normalizeSimulationInput(fallbackInput, fallbackInput);
  const safeRuleConfig = normalizeRuleConfig(result?.ruleConfig ?? fallbackRuleConfig);
  const participantMap = new Map(safeInput.participants.map((participant) => [participant.id, participant]));
  const participants = Array.isArray(result?.participants)
    ? result.participants.map((participant, index) => {
        const baseParticipant = normalizeParticipant(
          participant,
          participantMap.get(participant.id) ?? safeInput.participants[index] ?? safeInput.participants[0],
          index
        );
        const empty = emptyParticipantResult(baseParticipant);

        return {
          ...empty,
          ...participant,
          ...baseParticipant,
          awardedQuantity: finiteNumber(participant.awardedQuantity, empty.awardedQuantity),
          executedQuantity: finiteNumber(participant.executedQuantity, empty.executedQuantity),
          clearedOutput: finiteNumber(participant.clearedOutput, empty.clearedOutput),
          curtailedOutput: finiteNumber(participant.curtailedOutput, empty.curtailedOutput),
          settlementPrice: finiteNumber(participant.settlementPrice, empty.settlementPrice),
          energyRevenue: finiteNumber(participant.energyRevenue, empty.energyRevenue),
          contractRevenue: finiteNumber(participant.contractRevenue, empty.contractRevenue),
          spotQuantity: finiteNumber(participant.spotQuantity, empty.spotQuantity),
          spotSettlementAmount: finiteNumber(participant.spotSettlementAmount, empty.spotSettlementAmount),
          totalRevenue: finiteNumber(participant.totalRevenue, empty.totalRevenue),
          contractCoverageRate: finiteNumber(participant.contractCoverageRate, empty.contractCoverageRate),
          renewableSubsidyRevenue: finiteNumber(
            participant.renewableSubsidyRevenue,
            empty.renewableSubsidyRevenue
          ),
          capacityPayment: finiteNumber(participant.capacityPayment, empty.capacityPayment),
          capacityPenalty: finiteNumber(participant.capacityPenalty, empty.capacityPenalty),
          deviationPenalty: finiteNumber(participant.deviationPenalty, empty.deviationPenalty),
          curtailmentPenaltyCost: finiteNumber(
            participant.curtailmentPenaltyCost,
            empty.curtailmentPenaltyCost
          ),
          revenue: finiteNumber(participant.revenue, empty.revenue),
          totalCost: finiteNumber(participant.totalCost, empty.totalCost),
          profit: finiteNumber(participant.profit, empty.profit),
          isMarginalUnit: typeof participant.isMarginalUnit === "boolean"
            ? participant.isMarginalUnit
            : empty.isMarginalUnit,
          storageChargeQuantity: finiteNumber(participant.storageChargeQuantity, empty.storageChargeQuantity ?? 0),
          storageDischargeQuantity: finiteNumber(
            participant.storageDischargeQuantity,
            empty.storageDischargeQuantity ?? 0
          ),
          storageSocStart: finiteNumber(participant.storageSocStart, empty.storageSocStart ?? 0),
          storageSocEnd: finiteNumber(participant.storageSocEnd, empty.storageSocEnd ?? 0)
        };
      })
    : createEmptyClearingResult(safeRuleConfig, safeInput.participants).participants;

  const periodResults: PeriodClearingResult[] = Array.isArray(result?.periodResults)
    ? result.periodResults.map((period, index) => ({
        periodId: textValue(period?.periodId, `T${index + 1}`),
        periodLabel: textValue(period?.periodLabel, `T${index + 1}`),
        loadDemand: finiteNumber(period?.loadDemand, 0),
        baseLoadDemand: finiteNumber(period?.baseLoadDemand, 0),
        storageChargingLoad: finiteNumber(period?.storageChargingLoad, 0),
        storageDischargingSupply: finiteNumber(period?.storageDischargingSupply, 0),
        clearingPrice: finiteNumber(period?.clearingPrice, 0),
        totalClearedQuantity: finiteNumber(period?.totalClearedQuantity, 0),
        unmetDemand: finiteNumber(period?.unmetDemand, 0),
        participants: Array.isArray(period?.participants) ? period.participants : []
      }))
    : [];

  const storageDispatchPlans: StorageDispatchPlan[] = Array.isArray(result?.storageDispatchPlans)
    ? result.storageDispatchPlans
    : [];

  return {
    clearingPrice: finiteNumber(result?.clearingPrice, 0),
    totalClearedQuantity: finiteNumber(result?.totalClearedQuantity, 0),
    customerPurchaseCost: finiteNumber(result?.customerPurchaseCost, 0),
    totalGeneratorRevenue: finiteNumber(result?.totalGeneratorRevenue, 0),
    totalSystemCost: finiteNumber(result?.totalSystemCost, 0),
    socialWelfare: finiteNumber(result?.socialWelfare, 0),
    unmetDemand: finiteNumber(result?.unmetDemand, 0),
    renewableAwardedQuantity: finiteNumber(result?.renewableAwardedQuantity, 0),
    renewableConsumptionRate: finiteNumber(result?.renewableConsumptionRate, 0),
    renewableCurtailmentQuantity: finiteNumber(result?.renewableCurtailmentQuantity, 0),
    capacityPaymentTotal: finiteNumber(result?.capacityPaymentTotal, 0),
    deviationPenaltyTotal: finiteNumber(result?.deviationPenaltyTotal, 0),
    renewableSubsidyTotal: finiteNumber(result?.renewableSubsidyTotal, 0),
    curtailmentPenaltyTotal: finiteNumber(result?.curtailmentPenaltyTotal, 0),
    ruleConfig: safeRuleConfig,
    participants,
    periodResults,
    storageDispatchPlans,
    isMultiPeriod: typeof result?.isMultiPeriod === "boolean" ? result.isMultiPeriod : periodResults.length > 1
  };
}
