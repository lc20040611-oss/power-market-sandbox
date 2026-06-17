import type { SimulationInput } from "@/lib/types";

import { scenarioPresets } from "@/data/scenario-presets";

export const demoScenarios: Array<{ scenario: string; input: SimulationInput }> = scenarioPresets;

export const demoScenarioMap = {
  base: demoScenarios.find((item) => item.scenario === "基准场景") ?? demoScenarios[0],
  highRenewable:
    demoScenarios.find((item) => item.scenario === "高新能源场景") ?? demoScenarios[1] ?? demoScenarios[0],
  tightLoad:
    demoScenarios.find((item) => item.scenario === "高负荷紧张场景") ?? demoScenarios[2] ?? demoScenarios[0],
  highContract:
    demoScenarios.find((item) => item.scenario === "高中长期合约比例") ?? demoScenarios[0],
  capacity:
    demoScenarios.find((item) => item.scenario === "基准场景") ?? demoScenarios[0],
  storage:
    demoScenarios.find((item) => item.scenario === "新能源高波动场景") ?? demoScenarios[0],
  marketPower:
    demoScenarios.find((item) => item.scenario === "高负荷紧张场景") ?? demoScenarios[0]
} as const;
