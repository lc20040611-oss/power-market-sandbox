"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { exportPaperChartData } from "@/lib/export-utils";
import { buildPaperChartTitle, generateInsightText, generateResearchReportDraft } from "@/lib/paper-tools";
import { STORAGE_KEYS } from "@/lib/rule-config";
import { readStorage, writeStorage } from "@/lib/storage-utils";
import type {
  ExperimentRecordSummary,
  ExperimentRunArchiveRecord,
  ExperimentRunRecord,
  PaperChartConfig
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const metricOptions: PaperChartConfig["metricName"][] = [
  "clearingPrice",
  "customerPurchaseCost",
  "renewableConsumptionRate",
  "curtailmentRate",
  "socialWelfare",
  "hhi"
];

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function PaperToolsPanel() {
  const [catalog, setCatalog] = useState<ExperimentRecordSummary[]>([]);
  const [runs, setRuns] = useState<ExperimentRunArchiveRecord[]>([]);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>("");
  const [metricName, setMetricName] = useState<PaperChartConfig["metricName"]>("clearingPrice");
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [feedback, setFeedback] = useState("从数据库读取实验结果并生成论文图表。");

  useEffect(() => {
    const savedSelectedId = readStorage<string>(STORAGE_KEYS.selectedExperimentId, "");
    void loadCatalog(savedSelectedId);
  }, []);

  async function loadCatalog(initialSelectedId = "") {
    try {
      const data = await requestJson<{ experiments: ExperimentRecordSummary[] }>("/api/experiments");
      setCatalog(data.experiments);

      const nextSelectedId = initialSelectedId || data.experiments[0]?.id || "";
      if (nextSelectedId) {
        setSelectedExperimentId(nextSelectedId);
        writeStorage(STORAGE_KEYS.selectedExperimentId, nextSelectedId);
        await loadRuns(nextSelectedId);
      }
    } catch (error) {
      setFeedback(`加载实验目录失败：${String(error)}`);
    }
  }

  async function loadRuns(experimentId: string) {
    try {
      const data = await requestJson<{ runs: ExperimentRunArchiveRecord[] }>(
        `/api/experiments/${experimentId}/runs`
      );
      setRuns(data.runs);
    } catch (error) {
      setFeedback(`加载实验结果失败：${String(error)}`);
    }
  }

  const selectedExperiment = useMemo(
    () => catalog.find((record) => record.id === selectedExperimentId) ?? catalog[0] ?? null,
    [catalog, selectedExperimentId]
  );

  const selectedRecord: ExperimentRunRecord | null = runs[0]?.record ?? null;
  const chartTitle = selectedRecord ? buildPaperChartTitle(selectedRecord, metricName) : "";
  const chartData = selectedRecord ? exportPaperChartData(selectedRecord, metricName) : [];
  const insight = selectedRecord ? generateInsightText(selectedRecord, metricName) : "";

  const handleGenerateReport = () => {
    if (!selectedRecord) return;
    const report = generateResearchReportDraft(selectedRecord);
    setReportMarkdown(report.markdown);
    setFeedback("已基于数据库实验结果生成研究报告草稿。");
  };

  const handleSelectExperiment = async (experimentId: string) => {
    setSelectedExperimentId(experimentId);
    writeStorage(STORAGE_KEYS.selectedExperimentId, experimentId);
    setReportMarkdown("");
    await loadRuns(experimentId);
    setFeedback("已切换到数据库中的实验记录。");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>论文图表生成</CardTitle>
          <CardDescription>从数据库实验记录中选择结果和指标，自动生成论文图表、分析文字与 Markdown 报告。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span>选择实验结果</span>
            <select
              className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              value={selectedExperiment?.id ?? ""}
              onChange={(event) => void handleSelectExperiment(event.target.value)}
            >
              {catalog.length > 0 ? (
                catalog.map((record) => (
                  <option key={record.id} value={record.id} className="bg-slate-950">
                    {record.experimentName}
                  </option>
                ))
              ) : (
                <option value="" className="bg-slate-950">
                  暂无数据库实验记录
                </option>
              )}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>选择指标</span>
            <select
              className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              value={metricName}
              onChange={(event) => setMetricName(event.target.value as PaperChartConfig["metricName"])}
            >
              {metricOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-950">
                  {option}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 text-sm text-cyan-200">{feedback}</CardContent>
      </Card>

      {selectedRecord ? (
        <>
          <Card className="h-[420px]">
            <CardHeader>
              <CardTitle>{chartTitle}</CardTitle>
              <CardDescription>
                当前展示的是“{selectedRecord.experimentName}”最近一次归档运行结果。
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="rgba(148,163,184,0.16)" strokeDasharray="3 3" />
                  <XAxis dataKey="x" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip />
                  <Line type="monotone" dataKey="y" stroke="#38bdf8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>自动分析文字</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-300">{insight}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>研究报告草稿</CardTitle>
              <CardDescription>根据数据库归档的实验结果自动生成 Markdown 草稿。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleGenerateReport}>生成研究报告草稿</Button>
              {reportMarkdown ? (
                <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300 whitespace-pre-wrap">
                  {reportMarkdown}
                </pre>
              ) : (
                <p className="text-sm text-slate-400">点击按钮后会在此处生成 Markdown 草稿。</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-slate-400">
            尚无可用的数据库实验结果。请先在实验管理页面运行并存档一次实验。
          </CardContent>
        </Card>
      )}
    </div>
  );
}
