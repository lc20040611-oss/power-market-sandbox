import type { ExperimentRunRecord, ExportData, PaperChartConfig } from "./types";

const metricLabels: Record<PaperChartConfig["metricName"], string> = {
  clearingPrice: "出清电价",
  customerPurchaseCost: "用户购电成本",
  renewableConsumptionRate: "新能源消纳率",
  curtailmentRate: "弃风弃光率",
  socialWelfare: "社会福利",
  hhi: "HHI"
};

function csvEscape(value: string | number) {
  const raw = String(value);
  return raw.includes(",") ? `"${raw.replaceAll('"', '""')}"` : raw;
}

export function exportExperimentResultsCsv(record: ExperimentRunRecord): ExportData {
  const header = [
    "实验名称",
    "参数变量",
    "参数取值",
    "出清电价",
    "用户购电成本",
    "系统总成本",
    "社会福利",
    "新能源消纳率",
    "弃风弃光率",
    "市场力风险"
  ];
  const rows = record.results.map((result) =>
    [
      record.experimentName,
      result.parameterLabel,
      result.parameterValue,
      result.clearingPrice,
      result.customerPurchaseCost,
      result.totalSystemCost,
      result.socialWelfare,
      result.renewableConsumptionRate,
      result.curtailmentRate,
      result.marketPowerRiskLevel
    ]
      .map(csvEscape)
      .join(",")
  );

  return {
    fileName: `${record.experimentName}.csv`,
    mimeType: "text/csv",
    content: [header.join(","), ...rows].join("\n")
  };
}

export function exportExperimentResultsJson(record: ExperimentRunRecord): ExportData {
  return {
    fileName: `${record.experimentName}.json`,
    mimeType: "application/json",
    content: JSON.stringify(record, null, 2)
  };
}

export function exportPaperChartData(
  record: ExperimentRunRecord,
  metricName: PaperChartConfig["metricName"]
) {
  return record.results.map((result) => ({
    x: result.parameterValue,
    y: result[metricName],
    scenarioName: record.experimentName,
    metricName: metricLabels[metricName]
  }));
}
