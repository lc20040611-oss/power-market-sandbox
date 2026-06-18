export type RuleCard = {
  id: string;
  category: string;
  title: string;
  summary: string;
  objective: string;
  parameters: Array<{
    label: string;
    value: string;
    note: string;
  }>;
};

export type MarketRole = {
  id: string;
  name: string;
  objective: string;
  actions: string[];
  revenueSources: string[];
};

export type ParticipantType = "火电" | "新能源" | "储能";
export type ClearingMechanism = "uniformPrice" | "payAsBid";
export type SweepParameterKey =
  | "renewableShare"
  | "contractRatio"
  | "deviationPenaltyRate"
  | "capacityPaymentRate"
  | "storageCapacity"
  | "strategyBid"
  | "loadScale"
  | "priceCap"
  | "renewableSubsidy";

export type MarketParticipantPeriodInput = {
  periodId: string;
  price?: number;
  declaredQuantity?: number;
  actualQuantity?: number;
  forecastOutput?: number;
  availableOutput?: number;
};

export type StorageOptimizationConfig = {
  enabled: boolean;
  objective: "arbitrage" | "peakShaving";
  priceForecast?: number[];
  targetFinalSoc?: number;
  socStep?: number;
};

export type MarketParticipant = {
  id: string;
  name: string;
  type: ParticipantType;
  price: number;
  declaredQuantity: number;
  marginalCost: number;
  companyGroup?: string;
  contractQuantity?: number;
  contractPrice?: number;
  actualQuantity?: number;
  forecastOutput?: number;
  availableOutput?: number;
  storageCapacity?: number;
  chargePower?: number;
  dischargePower?: number;
  roundTripEfficiency?: number;
  initialSoc?: number;
  minSoc?: number;
  maxSoc?: number;
  availableCapacity?: number;
  capacityAvailabilityRate?: number;
  periodData?: MarketParticipantPeriodInput[];
  storageOptimization?: StorageOptimizationConfig;
};

export type TimePeriodInput = {
  id: string;
  label: string;
  loadDemand: number;
  priceHint?: number;
};

export type SimulationInput = {
  loadDemand: number;
  participants: MarketParticipant[];
  timePeriods?: TimePeriodInput[];
};

export type RuleConfig = {
  clearingMechanism: ClearingMechanism;
  priceCap: number;
  priceFloor: number;
  enableDeviationPenalty: boolean;
  deviationTolerance: number;
  deviationPenaltyRate: number;
  renewablePriority: boolean;
  curtailmentPenalty: number;
  renewableSubsidy: number;
  enableCapacityPayment: boolean;
  capacityPaymentRate: number;
};

export type ParticipantClearingResult = MarketParticipant & {
  awardedQuantity: number;
  executedQuantity: number;
  clearedOutput: number;
  curtailedOutput: number;
  settlementPrice: number;
  energyRevenue: number;
  contractRevenue: number;
  spotQuantity: number;
  spotSettlementAmount: number;
  totalRevenue: number;
  contractCoverageRate: number;
  renewableSubsidyRevenue: number;
  capacityPayment: number;
  capacityPenalty: number;
  deviationPenalty: number;
  curtailmentPenaltyCost: number;
  revenue: number;
  totalCost: number;
  profit: number;
  isMarginalUnit: boolean;
  storageChargeQuantity?: number;
  storageDischargeQuantity?: number;
  storageSocStart?: number;
  storageSocEnd?: number;
};

export type PeriodParticipantResult = ParticipantClearingResult & {
  periodId: string;
  periodLabel: string;
};

export type PeriodClearingResult = {
  periodId: string;
  periodLabel: string;
  loadDemand: number;
  baseLoadDemand: number;
  storageChargingLoad: number;
  storageDischargingSupply: number;
  clearingPrice: number;
  totalClearedQuantity: number;
  unmetDemand: number;
  participants: PeriodParticipantResult[];
};

export type StorageDispatchStep = {
  periodId: string;
  periodLabel: string;
  chargePower: number;
  dischargePower: number;
  socStart: number;
  socEnd: number;
  referencePrice: number;
};

export type StorageDispatchPlan = {
  participantId: string;
  participantName: string;
  steps: StorageDispatchStep[];
  chargeCost: number;
  dischargeRevenue: number;
  netArbitrageRevenue: number;
  equivalentCycles: number;
  peakLoadReduction: number;
};

export type ClearingResult = {
  clearingPrice: number;
  totalClearedQuantity: number;
  customerPurchaseCost: number;
  totalGeneratorRevenue: number;
  totalSystemCost: number;
  socialWelfare: number;
  unmetDemand: number;
  renewableAwardedQuantity: number;
  renewableConsumptionRate: number;
  renewableCurtailmentQuantity: number;
  capacityPaymentTotal: number;
  deviationPenaltyTotal: number;
  renewableSubsidyTotal: number;
  curtailmentPenaltyTotal: number;
  ruleConfig: RuleConfig;
  participants: ParticipantClearingResult[];
  periodResults: PeriodClearingResult[];
  storageDispatchPlans: StorageDispatchPlan[];
  isMultiPeriod: boolean;
};

export type MarketClearingResult = ClearingResult;

export type ScenarioConfig = {
  id: string;
  name: string;
  ruleConfig: RuleConfig;
};

export type ScenarioComparisonResult = {
  scenarioId: string;
  scenarioName: string;
  ruleConfig: RuleConfig;
  clearingPrice: number;
  totalClearedQuantity: number;
  customerPurchaseCost: number;
  totalGeneratorRevenue: number;
  totalSystemCost: number;
  socialWelfare: number;
  renewableAwardedQuantity: number;
  renewableConsumptionRate: number;
  renewableCurtailmentQuantity: number;
  capacityPaymentTotal: number;
  deviationPenaltyTotal: number;
  participantProfits: Array<{
    participantId: string;
    participantName: string;
    profit: number;
  }>;
};

export type ContractSettlement = {
  participantId: string;
  participantName: string;
  contractQuantity: number;
  contractPrice: number;
  actualQuantity: number;
  spotQuantity: number;
  contractRevenue: number;
  spotSettlementAmount: number;
  totalRevenue: number;
  contractCoverageRate: number;
};

export type RenewableMetrics = {
  totalForecastOutput: number;
  totalAvailableOutput: number;
  totalClearedOutput: number;
  totalCurtailedOutput: number;
  consumptionRate: number;
  curtailmentRate: number;
  subsidyAmount: number;
  participantMetrics: Array<{
    participantId: string;
    participantName: string;
    forecastOutput: number;
    availableOutput: number;
    clearedOutput: number;
    curtailedOutput: number;
    revenue: number;
  }>;
};

export type StorageAsset = {
  participantId: string;
  participantName: string;
  storageCapacity: number;
  chargePower: number;
  dischargePower: number;
  roundTripEfficiency: number;
  initialSoc: number;
  minSoc: number;
  maxSoc: number;
};

export type StorageSimulationResult = {
  participantId: string;
  participantName: string;
  socSeries: Array<{ hour: string; soc: number }>;
  powerSeries: Array<{ hour: string; chargePower: number; dischargePower: number }>;
  priceSeries: Array<{ hour: string; price: number }>;
  chargeCost: number;
  dischargeRevenue: number;
  netArbitrageRevenue: number;
  equivalentCycles: number;
  socChange: number;
  peakLoadReduction: number;
};

export type CapacityPaymentResult = {
  participantId: string;
  participantName: string;
  availableCapacity: number;
  capacityPrice: number;
  capacityRevenue: number;
  capacityAvailabilityRate: number;
  capacityPenalty: number;
};

export type StrategyBidScenario =
  | "costBased"
  | "markup10"
  | "markup20"
  | "capacityWithholding"
  | "peakHourMarkup";

export type MarketPowerMetrics = {
  hhi: number;
  cr3: number;
  cr5: number;
  rsi: number;
  riskLevel: "低风险" | "中风险" | "高风险";
  marketShares: Array<{
    participantId: string;
    participantName: string;
    marketShare: number;
  }>;
  strategyScenarios: Array<{
    scenario: StrategyBidScenario;
    clearingPrice: number;
    deltaFromBaseline: number;
  }>;
};

export type ParameterSweepConfig = {
  parameterKey: SweepParameterKey;
  label: string;
  values: Array<number | string>;
};

export type ParameterCombination = Record<string, number | string>;

export type ParameterSweepResult = {
  parameterKey: SweepParameterKey;
  parameterLabel: string;
  parameterValue: number | string;
  parameterValues: ParameterCombination;
  combinationLabel: string;
  clearingPrice: number;
  customerPurchaseCost: number;
  totalGeneratorRevenue: number;
  totalSystemCost: number;
  socialWelfare: number;
  renewableConsumptionRate: number;
  curtailmentRate: number;
  storageRevenue: number;
  capacityPaymentTotal: number;
  deviationPenaltyTotal: number;
  hhi: number;
  rsi: number;
  marketPowerRiskLevel: "低风险" | "中风险" | "高风险";
};

export type ExperimentConfig = {
  id: string;
  experimentName: string;
  researchQuestion: string;
  baseScenario: string;
  variableParameters: ParameterSweepConfig[];
  fixedParameters: Record<string, string | number | boolean>;
  notes: string;
};

export type ExperimentTemplate = {
  id: string;
  name: string;
  description: string;
  config: Omit<ExperimentConfig, "id" | "experimentName" | "researchQuestion" | "notes">;
};

export type ExperimentRunSnapshot = {
  baseInput: SimulationInput;
  appliedRuleConfig: RuleConfig;
  clearingResult: ClearingResult;
  marketPower: MarketPowerMetrics;
  renewableMetrics: RenewableMetrics;
};

export type ExperimentRunRecord = {
  experimentId: string;
  experimentName: string;
  researchQuestion: string;
  runAt: string;
  baseScenario: string;
  variableParameters: ParameterSweepConfig[];
  fixedParameters: Record<string, string | number | boolean>;
  notes: string;
  results: ParameterSweepResult[];
  resultSnapshot: ExperimentRunSnapshot;
  chartData: Array<Record<string, string | number>>;
  sourceVersion?: number;
  recordId?: string;
};

export type ExperimentRunSummary = {
  experimentId: string;
  experimentName: string;
  researchQuestion: string;
  runAt: string;
  baseScenario: string;
  parameterLabel: string;
  resultCount: number;
  sourceVersion?: number;
};

export type ExportData = {
  fileName: string;
  mimeType: "text/csv" | "application/json";
  content: string;
};

export type PaperChartConfig = {
  experimentId: string;
  metricName:
    | "clearingPrice"
    | "customerPurchaseCost"
    | "renewableConsumptionRate"
    | "curtailmentRate"
    | "socialWelfare"
    | "hhi";
  title: string;
};

export type ResearchReportDraft = {
  title: string;
  markdown: string;
};

export type ExperimentRecordSummary = {
  id: string;
  experimentName: string;
  researchQuestion: string;
  baseScenario: string;
  latestVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type ExperimentVersionRecord = {
  experimentId: string;
  version: number;
  config: ExperimentConfig;
  createdAt: string;
};

export type ExperimentRunArchiveRecord = {
  id: string;
  experimentId: string;
  experimentVersion: number;
  runAt: string;
  summary: ExperimentRunSummary;
  record: ExperimentRunRecord;
};
