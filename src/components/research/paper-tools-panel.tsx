"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { exportPaperChartData } from "@/lib/export-utils";
import { buildPaperChartTitle, generateInsightText, generateResearchReportDraft } from "@/lib/paper-tools";
import { STORAGE_KEYS } from "@/lib/rule-config";
import { readStorage } from "@/lib/storage-utils";
import type { ExperimentRunRecord, ExperimentRunSummary, PaperChartConfig } from "@/lib/types";
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

export function PaperToolsPanel() {
  const [summaries, setSummaries] = useState<ExperimentRunSummary[]>([]);
  const [activeRecord, setActiveRecord] = useState<ExperimentRunRecord | null>(null);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>("");
  const [metricName, setMetricName] = useState<PaperChartConfig["metricName"]>("clearingPrice");
  const [reportMarkdown, setReportMarkdown] = useState("");

  useEffect(() => {
    setSummaries(readStorage<ExperimentRunSummary[]>(STORAGE_KEYS.experimentSummaries, []));
    setActiveRecord(
      readStorage<ExperimentRunRecord | null>(STORAGE_KEYS.activeExperimentRecord, null, "sessionStorage")
    );
    setSelectedExperimentId(readStorage<string>(STORAGE_KEYS.selectedExperimentId, ""));
  }, []);

  const selectedSummary = useMemo(
    () => summaries.find((record) => record.experimentId === selectedExperimentId) ?? summaries[0],
    [summaries, selectedExperimentId]
  );

  const selectedRecord =
    activeRecord && activeRecord.experimentId === selectedSummary?.experimentId ? activeRecord : null;

  const chartTitle = selectedRecord ? buildPaperChartTitle(selectedRecord, metricName) : "";
  const chartData = selectedRecord ? exportPaperChartData(selectedRecord, metricName) : [];
  const insight = selectedRecord ? generateInsightText(selectedRecord, metricName) : "";

  const handleGenerateReport = () => {
    if (!selectedRecord) return;
    const report = generateResearchReportDraft(selectedRecord);
    setReportMarkdown(report.markdown);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>论文图表生成</CardTitle>
          <CardDescription>选择实验结果和指标，自动生成论文图表与简短分析文字。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span>选择实验结果</span>
            <select
              className="flex h-10 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              value={selectedSummary?.experimentId ?? ""}
              onChange={(event) => setSelectedExperimentId(event.target.value)}
            >
              {summaries.length > 0 ? (
                summaries.map((record) => (
                  <option key={record.experimentId} value={record.experimentId} className="bg-slate-950">
                    {record.experimentName}
                  </option>
                ))
              ) : (
                <option value="" className="bg-slate-950">
                  暂无实验摘要
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

      {selectedRecord ? (
        <>
          <Card className="h-[420px]">
            <CardHeader>
              <CardTitle>{chartTitle}</CardTitle>
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
              <CardDescription>根据实验结果自动生成 Markdown 草稿。</CardDescription>
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
            尚无可用的完整实验结果。请先在实验管理页面运行实验；若当前仅有摘要，请重新运行该实验以生成图表数据。
          </CardContent>
        </Card>
      )}
    </div>
  );
}
