import type { MarketParticipant, SimulationInput } from "@/lib/types";

function thermal(
  id: string,
  name: string,
  price: number,
  marginalCost: number,
  declaredQuantity: number,
  contractRatio: number,
  group: string
): MarketParticipant {
  return {
    id,
    name,
    type: "火电",
    companyGroup: group,
    price,
    marginalCost,
    declaredQuantity,
    contractQuantity: Math.round(declaredQuantity * contractRatio),
    contractPrice: 295,
    actualQuantity: Math.round(declaredQuantity * 0.92),
    availableCapacity: declaredQuantity,
    capacityAvailabilityRate: 0.95
  };
}

function renewable(
  id: string,
  name: string,
  declaredQuantity: number,
  availableOutput: number,
  forecastOutput: number,
  contractRatio: number,
  group: string
): MarketParticipant {
  return {
    id,
    name,
    type: "新能源",
    companyGroup: group,
    price: 0,
    marginalCost: 12,
    declaredQuantity,
    contractQuantity: Math.round(declaredQuantity * contractRatio),
    contractPrice: 268,
    actualQuantity: Math.round(availableOutput * 0.9),
    forecastOutput,
    availableOutput,
    availableCapacity: declaredQuantity,
    capacityAvailabilityRate: 0.88
  };
}

function storage(
  id: string,
  name: string,
  price: number,
  declaredQuantity: number,
  group: string
): MarketParticipant {
  return {
    id,
    name,
    type: "储能",
    companyGroup: group,
    price,
    marginalCost: 165,
    declaredQuantity,
    contractQuantity: 0,
    contractPrice: 0,
    actualQuantity: Math.round(declaredQuantity * 0.85),
    storageCapacity: 120,
    chargePower: 45,
    dischargePower: 45,
    roundTripEfficiency: 0.9,
    initialSoc: 0.5,
    minSoc: 0.15,
    maxSoc: 0.95,
    availableCapacity: declaredQuantity,
    capacityAvailabilityRate: 0.97
  };
}

export const scenarioPresets: Array<{ scenario: string; input: SimulationInput }> = [
  {
    scenario: "基准场景",
    input: {
      loadDemand: 520,
      participants: [
        thermal("base-t1", "火电 A", 280, 210, 180, 0.55, "华东能源"),
        thermal("base-t2", "火电 B", 340, 250, 160, 0.5, "华东能源"),
        thermal("base-t3", "火电 C", 420, 320, 120, 0.45, "沿海电力"),
        renewable("base-r1", "新能源 A", 140, 155, 145, 0.35, "绿电集团"),
        storage("base-s1", "储能 A", 320, 60, "灵活资源公司")
      ]
    }
  },
  {
    scenario: "高新能源场景",
    input: {
      loadDemand: 520,
      participants: [
        thermal("green-t1", "火电 A", 290, 220, 160, 0.48, "华东能源"),
        thermal("green-t2", "火电 B", 360, 260, 140, 0.45, "沿海电力"),
        thermal("green-t3", "火电 C", 450, 335, 120, 0.4, "北方发电"),
        renewable("green-r1", "新能源 A", 200, 220, 205, 0.3, "绿电集团"),
        renewable("green-r2", "新能源 B", 60, 72, 65, 0.25, "绿电集团"),
        storage("green-s1", "储能 A", 310, 80, "灵活资源公司")
      ]
    }
  },
  {
    scenario: "高负荷紧张场景",
    input: {
      loadDemand: 680,
      participants: [
        thermal("tight-t1", "火电 A", 300, 220, 180, 0.62, "华东能源"),
        thermal("tight-t2", "火电 B", 360, 270, 170, 0.58, "华东能源"),
        thermal("tight-t3", "火电 C", 460, 340, 150, 0.52, "沿海电力"),
        renewable("tight-r1", "新能源 A", 110, 125, 118, 0.2, "绿电集团"),
        storage("tight-s1", "储能 A", 380, 70, "灵活资源公司")
      ]
    }
  },
  {
    scenario: "高中长期合约比例",
    input: {
      loadDemand: 540,
      participants: [
        thermal("contract-hi-t1", "火电 A", 285, 215, 170, 0.8, "华东能源"),
        thermal("contract-hi-t2", "火电 B", 345, 255, 150, 0.78, "沿海电力"),
        renewable("contract-hi-r1", "新能源 A", 120, 132, 126, 0.55, "绿电集团"),
        storage("contract-hi-s1", "储能 A", 315, 55, "灵活资源公司")
      ]
    }
  },
  {
    scenario: "低中长期合约比例",
    input: {
      loadDemand: 540,
      participants: [
        thermal("contract-lo-t1", "火电 A", 285, 215, 170, 0.2, "华东能源"),
        thermal("contract-lo-t2", "火电 B", 345, 255, 150, 0.18, "沿海电力"),
        renewable("contract-lo-r1", "新能源 A", 120, 132, 126, 0.1, "绿电集团"),
        storage("contract-lo-s1", "储能 A", 315, 55, "灵活资源公司")
      ]
    }
  },
  {
    scenario: "高现货暴露风险场景",
    input: {
      loadDemand: 560,
      participants: [
        thermal("spot-risk-t1", "火电 A", 310, 225, 180, 0.15, "华东能源"),
        thermal("spot-risk-t2", "火电 B", 390, 280, 150, 0.12, "沿海电力"),
        renewable("spot-risk-r1", "新能源 A", 140, 165, 130, 0.05, "绿电集团"),
        storage("spot-risk-s1", "储能 A", 345, 65, "灵活资源公司")
      ]
    }
  },
  {
    scenario: "新能源占比 20%",
    input: {
      loadDemand: 600,
      participants: [
        thermal("re20-t1", "火电 A", 295, 220, 190, 0.5, "华东能源"),
        thermal("re20-t2", "火电 B", 355, 260, 180, 0.48, "沿海电力"),
        renewable("re20-r1", "新能源 A", 80, 95, 88, 0.2, "绿电集团"),
        storage("re20-s1", "储能 A", 330, 50, "灵活资源公司")
      ]
    }
  },
  {
    scenario: "新能源占比 40%",
    input: {
      loadDemand: 600,
      participants: [
        thermal("re40-t1", "火电 A", 295, 220, 170, 0.46, "华东能源"),
        thermal("re40-t2", "火电 B", 355, 260, 150, 0.42, "沿海电力"),
        renewable("re40-r1", "新能源 A", 160, 182, 171, 0.25, "绿电集团"),
        renewable("re40-r2", "新能源 B", 70, 78, 74, 0.2, "绿电集团"),
        storage("re40-s1", "储能 A", 320, 60, "灵活资源公司")
      ]
    }
  },
  {
    scenario: "新能源占比 60%",
    input: {
      loadDemand: 600,
      participants: [
        thermal("re60-t1", "火电 A", 305, 230, 140, 0.4, "华东能源"),
        thermal("re60-t2", "火电 B", 375, 275, 120, 0.35, "沿海电力"),
        renewable("re60-r1", "新能源 A", 220, 260, 238, 0.18, "绿电集团"),
        renewable("re60-r2", "新能源 B", 100, 115, 108, 0.15, "绿电集团"),
        storage("re60-s1", "储能 A", 315, 70, "灵活资源公司")
      ]
    }
  },
  {
    scenario: "新能源高波动场景",
    input: {
      loadDemand: 600,
      participants: [
        thermal("volatile-t1", "火电 A", 300, 225, 170, 0.42, "华东能源"),
        thermal("volatile-t2", "火电 B", 370, 272, 150, 0.38, "沿海电力"),
        renewable("volatile-r1", "新能源 A", 190, 250, 150, 0.15, "绿电集团"),
        renewable("volatile-r2", "新能源 B", 90, 125, 78, 0.12, "绿电集团"),
        storage("volatile-s1", "储能 A", 325, 75, "灵活资源公司")
      ]
    }
  }
];
