"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { demoScenarios } from "@/data/demo-scenarios";
import {
  buildExperimentConfigFromTemplate,
  experimentTemplates,
  runExperiment,
  summarizeExperimentRecord
} from "@/lib/experiment-runner";
import { exportExperimentResultsCsv, exportExperimentResultsJson } from "@/lib/export-utils";
import { getDefaultSweepConfigs } from "@/lib/parameter-sweep";
import { STORAGE_KEYS } from "@/lib/rule-config";
import { clearStorageKeys, estimateStorageUsage, readStorage, removeStorage, writeStorage } from "@/lib/storage-utils";
import type {
  ExperimentConfig,
  ExperimentRunRecord,
  ExperimentRunSummary
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LOCAL_KEYS = [STORAGE_KEYS.experimentSummaries, STORAGE_KEYS.selectedExperimentId];

export function ExperimentsPanel() {
  const defaultTemplate = experimentTemplates[0];
  const [summaries, setSummaries] = useState<ExperimentRunSummary[]>([]);
  const [activeRecord, setActiveRecord] = useState<ExperimentRunRecord | null>(null);
  const [config, setConfig] = useState<ExperimentConfig>(() =>
    buildExperimentConfigFromTemplate(defaultTemplate)
  );
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("准备运行实验");

  useEffect(() => {
    const savedSummaries = readStorage<ExperimentRunSummary[]>(
      STORAGE_KEYS.experimentSummaries,
      []
    );
    const savedActiveRecord = readStorage<ExperimentRunRecord | null>(
      STORAGE_KEYS.activeExperimentRecord,
      null,
      "sessionStorage"
    );
    const savedSelectedId = readStorage<string>(STORAGE_KEYS.selectedExperimentId, "");

    setSummaries(savedSummaries);
    setActiveRecord(savedActiveRecord);
    setSelectedExperimentId(savedSelectedId || savedActiveRecord?.experimentId || savedSummaries[0]?.experimentId || "");
  }, []);

  const selectedSummary = useMemo(
    () => summaries.find((summary) => summary.experimentId === selectedExperimentId) ?? summaries[0],
    [summaries, selectedExperimentId]
  );

  const visibleRecord =
    activeRecord && activeRecord.experimentId === selectedExperimentId ? activeRecord : activeRecord;

  const storageEstimate = estimateStorageUsage(LOCAL_KEYS);

  const updateConfig = <K extends keyof ExperimentConfig>(key: K, value: ExperimentConfig[K]) => {
    setConfig((current) => ({
      ...current,
      [key]: value
    }));
  };

  const applyTemplate = (templateId: string) => {
    const template = experimentTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setConfig(buildExperimentConfigFromTemplate(template));
    setFeedback(`已载入模板：${template.name}`);
  };

  const handleRunExperiment = () => {
    const baseInput =
      demoScenarios.find((scenario) => scenario.scenario === config.baseScenario)?.input ??
      demoScenarios[0].input;
    const record = runExperiment(config, baseInput);
    const summary = summarizeExperimentRecord(record);
    const nextSummaries = [summary, ...summaries.filter((item) => item.experimentId !== summary.experimentId)].slice(0, 12);

    setSummaries(nextSummaries);
    setActiveRecord(record);
    setSelectedExperimentId(record.experimentId);
    writeStorage(STORAGE_KEYS.experimentSummaries, nextSummaries);
    writeStorage(STORAGE_KEYS.activeExperimentRecord, record, "sessionStorage");
    writeStorage(STORAGE_KEYS.selectedExperimentId, record.experimentId);
    setFeedback(`实验运行完成，共生成 ${record.results.length} 组参数结果`);
  };

  const handleSelectExperiment = (experimentId: string) => {
    setSelectedExperimentId(experimentId);
    writeStorage(STORAGE_KEYS.selectedExperimentId, experimentId);
    if (activeRecord?.experimentId !== experimentId) {
      setFeedback("该实验仅保留摘要。完整结果请在当前会话中重新运行。");
    } else {
      setFeedback("已切换到当前会话中的完整实验结果。");
    }
  };

  const clearExperimentData = () => {
    setSummaries([]);
    setActiveRecord(null);
    setSelectedExperimentId("");
    clearStorageKeys(LOCAL_KEYS);
    removeStorage(STORAGE_KEYS.activeExperimentRecord, "sessionStorage");
    setFeedback("本地实验摘要和当前会话结果已清空。");
  };

  const downloadExport = (type: "csv" | "json") => {
    if (!visibleRecord || visibleRecord.experimentId !== selectedExperimentId) {
      setFeedback("当前仅有摘要，无法导出完整结果。请重新运行该实验。");
      return;
    }

    const exportData =
      type === "csv"
        ? exportExperimentResultsCsv(visibleRecord)
        : exportExperimentResultsJson(visibleRecord);
    const blob = new Blob([exportData.content], { type: exportData.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportData.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setFeedback(`已导出 ${type.toUpperCase()} 文件`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>创建实验</CardTitle>
          <CardDescription>支持论文分析、课题研究和政策模拟的实验配置工作流。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            {experimentTemplates.map((template) => (
              <Button key={template.id} variant="outline" size="sm" onClick={() => applyTemplate(template.id)}>
                {template.name}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Field label="实验名称">
              <Input value={config.experimentName} onChange={(event) => updateConfig("experimentName", event.target.value)} />
            </Field>
            <Field label="研究问题">
              <Input value={config.researchQuestion} onChange={(event) => updateConfig("researchQuestion", event.target.value)} />
            </Field>
            <Field label="基准场景">
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                value={config.baseScenario}
                onChange={(event) => updateConfig("baseScenario", event.target.value)}
              >
                {demoScenarios.map((scenario) => (
                  <option key={scenario.scenario} value={scenario.scenario} className="bg-slate-950">
                    {scenario.scenario}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="变量参数">
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                value={config.variableParameters[0]?.parameterKey}
                onChange={(event) => {
                  const sweep = getDefaultSweepConfigs().find((item) => item.parameterKey === event.target.value);
                  if (sweep) updateConfig("variableParameters", [sweep]);
                }}
              >
                {getDefaultSweepConfigs().map((sweep) => (
                  <option key={sweep.parameterKey} value={sweep.parameterKey} className="bg-slate-950">
                    {sweep.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="实验备注">
            <textarea
              className="min-h-24 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              value={config.notes}
              onChange={(event) => updateConfig("notes", event.target.value)}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={handleRunExperiment}>
              运行实验
            </Button>
            <span className="text-sm text-cyan-200">{feedback}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>实验运行记录</CardTitle>
          <CardDescription>
            `localStorage` 仅保存最近实验摘要和选择状态；完整实验结果仅保存在当前会话中，避免长期占用本地存储。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Badge>本地存储估算 {storageEstimate} 字节</Badge>
            <Button size="sm" variant="outline" onClick={clearExperimentData}>
              清空本地实验数据
            </Button>
          </div>

          {summaries.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {summaries.map((summary) => (
                <Button
                  key={summary.experimentId}
                  variant={summary.experimentId === selectedSummary?.experimentId ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectExperiment(summary.experimentId)}
                >
                  {summary.experimentName}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">尚无实验摘要，请先运行一次实验。</p>
          )}

          {selectedSummary ? (
            <>
              <div className="flex flex-wrap gap-3">
                <Badge>运行时间 {selectedSummary.runAt}</Badge>
                <Badge variant="secondary">参数 {selectedSummary.parameterLabel}</Badge>
                <Badge variant="secondary">结果组数 {selectedSummary.resultCount}</Badge>
                <Button size="sm" variant="outline" onClick={() => downloadExport("csv")}>
                  导出 CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadExport("json")}>
                  导出 JSON
                </Button>
              </div>

              {visibleRecord && visibleRecord.experimentId === selectedSummary.experimentId ? (
                <>
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/5 text-left text-slate-300">
                        <tr>
                          <th className="px-4 py-3 font-medium">实验名称</th>
                          <th className="px-4 py-3 font-medium">参数变量</th>
                          <th className="px-4 py-3 font-medium">参数取值</th>
                          <th className="px-4 py-3 font-medium">出清电价</th>
                          <th className="px-4 py-3 font-medium">用户成本</th>
                          <th className="px-4 py-3 font-medium">系统成本</th>
                          <th className="px-4 py-3 font-medium">社会福利</th>
                          <th className="px-4 py-3 font-medium">新能源消纳率</th>
                          <th className="px-4 py-3 font-medium">弃风弃光率</th>
                          <th className="px-4 py-3 font-medium">市场力风险</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRecord.results.map((result, index) => (
                          <tr key={`${visibleRecord.experimentId}-${index}`} className="border-t border-white/10 text-slate-300">
                            <td className="px-4 py-3">{visibleRecord.experimentName}</td>
                            <td className="px-4 py-3">{result.parameterLabel}</td>
                            <td className="px-4 py-3">{String(result.parameterValue)}</td>
                            <td className="px-4 py-3">{result.clearingPrice}</td>
                            <td className="px-4 py-3">{result.customerPurchaseCost}</td>
                            <td className="px-4 py-3">{result.totalSystemCost}</td>
                            <td className="px-4 py-3">{result.socialWelfare}</td>
                            <td className="px-4 py-3">{(result.renewableConsumptionRate * 100).toFixed(2)}%</td>
                            <td className="px-4 py-3">{(result.curtailmentRate * 100).toFixed(2)}%</td>
                            <td className="px-4 py-3">{result.marketPowerRiskLevel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <MetricLineChart title="参数变化 vs 出清电价" data={visibleRecord.chartData} lineKey="clearingPrice" />
                    <MetricLineChart title="参数变化 vs 用户购电成本" data={visibleRecord.chartData} lineKey="customerPurchaseCost" />
                    <MetricLineChart title="参数变化 vs 新能源消纳率" data={visibleRecord.chartData} lineKey="renewableConsumptionRate" />
                    <MetricLineChart title="参数变化 vs 弃风弃光率" data={visibleRecord.chartData} lineKey="curtailmentRate" />
                    <MetricLineChart title="参数变化 vs 社会福利" data={visibleRecord.chartData} lineKey="socialWelfare" />
                    <MetricBarChart title="参数变化 vs 市场力风险指标" data={visibleRecord.chartData} barKey="hhi" />
                  </div>
                </>
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  当前实验只保留了摘要。若要查看完整图表和结果，请重新运行该实验。
                </p>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2 text-sm text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MetricLineChart({
  title,
  data,
  lineKey
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  lineKey: string;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">暂无图表数据。</CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[340px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="parameterValue" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={lineKey} stroke="#38bdf8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function MetricBarChart({
  title,
  data,
  barKey
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  barKey: string;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">暂无图表数据。</CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[340px]">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
            <XAxis dataKey="parameterValue" stroke="#cbd5e1" />
            <YAxis stroke="#cbd5e1" />
            <Tooltip />
            <Bar dataKey={barKey} fill="#22d3ee" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
