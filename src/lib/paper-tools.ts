import type { ExperimentRunRecord, PaperChartConfig, ResearchReportDraft } from "./types";

const metricTitles: Record<PaperChartConfig["metricName"], string> = {
  clearingPrice: "出清电价",
  customerPurchaseCost: "用户购电成本",
  renewableConsumptionRate: "新能源消纳率",
  curtailmentRate: "弃风弃光率",
  socialWelfare: "社会福利",
  hhi: "市场集中度"
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildPaperChartTitle(record: ExperimentRunRecord, metricName: PaperChartConfig["metricName"]) {
  const parameterLabel =
    record.variableParameters.map((item) => item.label).join(" + ") || "参数组合";
  return `${parameterLabel}对${metricTitles[metricName]}的影响`;
}

export function generateInsightText(
  record: ExperimentRunRecord,
  metricName: PaperChartConfig["metricName"]
) {
  const values = record.results.map((result) => Number(result[metricName]));
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const trend = last > first ? "上升" : last < first ? "下降" : "基本稳定";
  const renewableAvg = average(record.results.map((result) => result.renewableConsumptionRate));
  const curtailmentAvg = average(record.results.map((result) => result.curtailmentRate));
  const parameterLabel =
    record.variableParameters.map((item) => item.label).join(" + ") || "关键参数组合";

  return `从实验结果可以看出，随着${parameterLabel}变化，${
    metricTitles[metricName]
  }整体呈现${trend}趋势。平均新能源消纳率为${(renewableAvg * 100).toFixed(
    2
  )}%，平均弃风弃光率为${(curtailmentAvg * 100).toFixed(
    2
  )}%。这说明规则参数变化不仅影响价格结果，也会通过灵活性与市场激励机制改变系统消纳表现。`;
}

export function generateResearchReportDraft(record: ExperimentRunRecord): ResearchReportDraft {
  const parameterLabel = record.variableParameters.map((item) => item.label).join(" + ") || "参数组合";
  const parameterValues = record.variableParameters
    .map((item) => `${item.label}: ${item.values.join(", ")}`)
    .join("；");
  const averageWelfare = average(record.results.map((result) => result.socialWelfare)).toFixed(2);

  const markdown = `# 研究问题
${record.researchQuestion}

# 实验设计
本实验基于场景“${record.baseScenario}”开展，围绕${parameterLabel}进行参数扫描。

# 参数设置
- 变量参数：${parameterLabel}
- 参数取值：${parameterValues}
- 固定参数：${JSON.stringify(record.fixedParameters)}

# 规则机制
实验沿用平台当前的出清、偏差考核、容量补偿和新能源机制设置，并在变量参数上进行调整。

# 实验结果
共获得 ${record.results.length} 组实验结果，平均社会福利为 ${averageWelfare}。

# 结果分析
${generateInsightText(record, "socialWelfare")}

# 政策启示
实验表明，关键规则参数调整会同时影响价格、收益分配与新能源消纳表现，政策设计应兼顾效率、成本与可靠性目标。

# 模型局限性
当前模型已支持多时段逐时出清、储能时序优化与数据库化实验存档，但仍采用简化容量机制，尚未纳入网络约束、完整机组组合优化和真实行为博弈。`;

  return {
    title: `${record.experimentName}研究报告草稿`,
    markdown
  };
}
