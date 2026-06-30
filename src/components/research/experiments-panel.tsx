"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  runExperiment
} from "@/lib/experiment-runner";
import { exportExperimentResultsCsv, exportExperimentResultsJson } from "@/lib/export-utils";
import { countParameterCombinations, getDefaultSweepConfigs } from "@/lib/parameter-sweep";
import { normalizeSimulationInput } from "@/lib/runtime-guards";
import { STORAGE_KEYS } from "@/lib/rule-config";
import { estimateStorageUsage, readStorage, writeStorage } from "@/lib/storage-utils";
import type {
  ExperimentRecordSummary,
  ExperimentRunArchiveRecord,
  ExperimentRunRecord,
  ExperimentConfig,
  ExperimentVersionRecord
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    throw new Error([`${response.status} ${response.statusText}`, details].filter(Boolean).join("："));
  }

  return (await response.json()) as T;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildDraftConfig(template: (typeof experimentTemplates)[number]) {
  return buildExperimentConfigFromTemplate(template, { id: `${template.id}-draft` });
}

export function ExperimentsPanel() {
  const defaultTemplate = experimentTemplates[0];
  const [catalog, setCatalog] = useState<ExperimentRecordSummary[]>([]);
  const [runs, setRuns] = useState<ExperimentRunArchiveRecord[]>([]);
  const [versions, setVersions] = useState<ExperimentVersionRecord[]>([]);
  const [activeRecord, setActiveRecord] = useState<ExperimentRunRecord | null>(null);
  const [config, setConfig] = useState<ExperimentConfig>(() =>
    buildDraftConfig(defaultTemplate)
  );
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("准备运行实验");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState(0);

  useEffect(() => {
    const savedSelectedId = readStorage<string>(STORAGE_KEYS.selectedExperimentId, "");
    setConfig(buildExperimentConfigFromTemplate(defaultTemplate));
    setStorageEstimate(estimateStorageUsage([STORAGE_KEYS.selectedExperimentId]));
    void loadCatalog(savedSelectedId);
  }, []);

  const selectedExperiment = useMemo(
    () => catalog.find((item) => item.id === selectedExperimentId) ?? catalog[0] ?? null,
    [catalog, selectedExperimentId]
  );

  const selectedRun =
    activeRecord && activeRecord.experimentId === selectedExperimentId
      ? activeRecord
      : runs[0]?.record ?? null;

  const combinationCount = countParameterCombinations(config.variableParameters);

  async function loadCatalog(initialSelectedId = "") {
    try {
      const data = await requestJson<{ experiments: ExperimentRecordSummary[] }>("/api/experiments");
      setCatalog(data.experiments);

      const nextSelectedId = initialSelectedId || data.experiments[0]?.id || "";
      if (nextSelectedId) {
        setSelectedExperimentId(nextSelectedId);
        writeStorage(STORAGE_KEYS.selectedExperimentId, nextSelectedId);
        await loadExperimentDetails(nextSelectedId);
      }
    } catch (error) {
      setFeedback(`加载实验目录失败：${String(error)}`);
    }
  }

  async function loadExperimentDetails(experimentId: string) {
    try {
      const [versionsResponse, runsResponse] = await Promise.all([
        requestJson<{ versions: ExperimentVersionRecord[] }>(`/api/experiments/${experimentId}`),
        requestJson<{ runs: ExperimentRunArchiveRecord[] }>(`/api/experiments/${experimentId}/runs`)
      ]);
      setVersions(versionsResponse.versions);
      setRuns(runsResponse.runs);
      setActiveRecord(runsResponse.runs[0]?.record ?? null);
    } catch (error) {
      setFeedback(`加载实验详情失败：${String(error)}`);
    }
  }

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

  const handleRunExperiment = async () => {
    setIsSubmitting(true);
    setFeedback("实验运行中...");
    try {
      const baseInput = normalizeSimulationInput(
        demoScenarios.find((scenario) => scenario.scenario === config.baseScenario)?.input ??
          demoScenarios[0].input,
        demoScenarios[0].input
      );
      const runConfig = config.id.endsWith("-draft")
        ? { ...config, id: `${config.id.slice(0, -"-draft".length)}-${Date.now()}` }
        : config;
      console.info("[experiments] run requested", {
        config: runConfig,
        baseInput
      });

      const saveResult = await requestJson<{ version: number; updatedAt: string }>("/api/experiments", {
        method: "POST",
        body: JSON.stringify(runConfig)
      });

      const record = runExperiment(runConfig, baseInput);
      record.sourceVersion = saveResult.version;
      console.info("[experiments] run result", {
        experimentId: record.experimentId,
        resultCount: record.results.length,
        chartPoints: record.chartData.length,
        runAt: record.runAt
      });

      const runResponse = await requestJson<{ record: ExperimentRunRecord }>(
        `/api/experiments/${runConfig.id}/runs`,
        {
          method: "POST",
          body: JSON.stringify({
            experimentVersion: saveResult.version,
            record
          })
        }
      );

      setActiveRecord(runResponse.record);
      setSelectedExperimentId(runConfig.id);
      writeStorage(STORAGE_KEYS.selectedExperimentId, runConfig.id);
      setStorageEstimate(estimateStorageUsage([STORAGE_KEYS.selectedExperimentId]));
      await loadCatalog(runConfig.id);
      setFeedback(`实验已存档，版本 v${saveResult.version}，共 ${record.results.length} 组结果`);
    } catch (error) {
      console.error("[experiments] run failed", error, { config });
      setFeedback(`实验运行失败：${formatError(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectExperiment = async (experimentId: string) => {
    setSelectedExperimentId(experimentId);
    writeStorage(STORAGE_KEYS.selectedExperimentId, experimentId);
    await loadExperimentDetails(experimentId);
    setFeedback("已切换到数据库中的实验记录。");
  };

  const downloadExport = (type: "csv" | "json") => {
    if (!selectedRun) {
      setFeedback("当前没有可导出的实验结果。");
      return;
    }

    const exportData =
      type === "csv"
        ? exportExperimentResultsCsv(selectedRun)
        : exportExperimentResultsJson(selectedRun);
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
          <CardDescription>已支持多变量组合实验、SQLite 存档和实验版本管理。</CardDescription>
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
            <Field label="变量参数 1">
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                value={config.variableParameters[0]?.parameterKey}
                onChange={(event) => {
                  const sweep = getDefaultSweepConfigs().find((item) => item.parameterKey === event.target.value);
                  if (!sweep) return;
                  updateConfig("variableParameters", [sweep, ...config.variableParameters.slice(1, 3)]);
                }}
              >
                {getDefaultSweepConfigs().map((sweep) => (
                  <option key={sweep.parameterKey} value={sweep.parameterKey} className="bg-slate-950">
                    {sweep.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="变量参数 2">
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                value={config.variableParameters[1]?.parameterKey ?? ""}
                onChange={(event) => {
                  if (!event.target.value) {
                    updateConfig("variableParameters", config.variableParameters.slice(0, 1));
                    return;
                  }
                  const sweep = getDefaultSweepConfigs().find((item) => item.parameterKey === event.target.value);
                  if (!sweep) return;
                  updateConfig("variableParameters", [config.variableParameters[0] ?? sweep, sweep, ...config.variableParameters.slice(2, 3)]);
                }}
              >
                <option value="" className="bg-slate-950">不启用</option>
                {getDefaultSweepConfigs().map((sweep) => (
                  <option key={sweep.parameterKey} value={sweep.parameterKey} className="bg-slate-950">
                    {sweep.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="变量参数 3">
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                value={config.variableParameters[2]?.parameterKey ?? ""}
                onChange={(event) => {
                  if (!event.target.value) {
                    updateConfig("variableParameters", config.variableParameters.slice(0, 2));
                    return;
                  }
                  const sweep = getDefaultSweepConfigs().find((item) => item.parameterKey === event.target.value);
                  if (!sweep) return;
                  updateConfig(
                    "variableParameters",
                    [config.variableParameters[0], config.variableParameters[1], sweep].filter(Boolean) as ExperimentConfig["variableParameters"]
                  );
                }}
              >
                <option value="" className="bg-slate-950">不启用</option>
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
            <Badge>组合数 {combinationCount}</Badge>
            <Badge variant="secondary">浏览器缓存估算 {storageEstimate} 字节</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={handleRunExperiment} disabled={isSubmitting}>
              {isSubmitting ? "运行中..." : "运行实验"}
            </Button>
            <span className="text-sm text-cyan-200">{feedback}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>实验版本与运行记录</CardTitle>
          <CardDescription>配置版本和运行结果已持久化到 SQLite，不再依赖 `localStorage` 保存完整实验数据。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {catalog.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {catalog.map((summary) => (
                <Button
                  key={summary.id}
                  variant={summary.id === selectedExperiment?.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => void handleSelectExperiment(summary.id)}
                >
                  {summary.experimentName}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">尚无数据库实验记录，请先运行一次实验。</p>
          )}

          {selectedExperiment ? (
            <>
              <div className="flex flex-wrap gap-3">
                <Badge>最新版本 v{selectedExperiment.latestVersion}</Badge>
                <Badge variant="secondary">最近更新 {selectedExperiment.updatedAt}</Badge>
                <Badge variant="secondary">运行次数 {runs.length}</Badge>
                <Button size="sm" variant="outline" onClick={() => downloadExport("csv")}>
                  导出 CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadExport("json")}>
                  导出 JSON
                </Button>
              </div>

              {versions.length > 0 ? (
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                  <p className="font-medium text-white">配置版本</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {versions.map((version) => (
                      <Badge key={`${version.experimentId}-${version.version}`} variant="secondary">
                        v{version.version} · {version.createdAt}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedRun ? (
                <>
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/5 text-left text-slate-300">
                        <tr>
                          <th className="px-4 py-3 font-medium">实验名称</th>
                          <th className="px-4 py-3 font-medium">组合</th>
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
                        {selectedRun.results.map((result, index) => (
                          <tr key={`${selectedRun.experimentId}-${index}`} className="border-t border-white/10 text-slate-300">
                            <td className="px-4 py-3">{selectedRun.experimentName}</td>
                            <td className="px-4 py-3">{result.combinationLabel}</td>
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
                    <MetricLineChart title="组合结果 vs 出清电价" data={selectedRun.chartData} lineKey="clearingPrice" />
                    <MetricLineChart title="组合结果 vs 用户购电成本" data={selectedRun.chartData} lineKey="customerPurchaseCost" />
                    <MetricLineChart title="组合结果 vs 新能源消纳率" data={selectedRun.chartData} lineKey="renewableConsumptionRate" />
                    <MetricLineChart title="组合结果 vs 弃风弃光率" data={selectedRun.chartData} lineKey="curtailmentRate" />
                    <MetricLineChart title="组合结果 vs 社会福利" data={selectedRun.chartData} lineKey="socialWelfare" />
                    <MetricBarChart title="组合结果 vs 市场力风险指标" data={selectedRun.chartData} barKey="hhi" />
                  </div>
                </>
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  该实验目前还没有运行记录。
                </p>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm text-slate-300">
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="combinationLabel" hide />
            <YAxis stroke="rgba(148,163,184,0.8)" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={lineKey} stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} />
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="combinationLabel" hide />
            <YAxis stroke="rgba(148,163,184,0.8)" />
            <Tooltip />
            <Legend />
            <Bar dataKey={barKey} fill="#0ea5e9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
