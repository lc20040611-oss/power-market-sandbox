"use client";

import { useEffect, useMemo, useState } from "react";

import { scenarioPresets } from "@/data/scenario-presets";
import { compareScenarios, runMarketClearing } from "@/lib/market-clearing";
import { defaultRuleConfig, ruleTemplates, STORAGE_KEYS } from "@/lib/rule-config";
import { readStorage } from "@/lib/storage-utils";
import type { ClearingResult, RuleConfig } from "@/lib/types";
import { AwardChart, BidCurveChart, ProfitChart, ScenarioCompareChart } from "@/components/charts/chart-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const baselineScenario = scenarioPresets[0].input;

export function AnalysisPanel() {
  const [latestResult, setLatestResult] = useState<ClearingResult>(() =>
    runMarketClearing(baselineScenario, defaultRuleConfig)
  );
  const [activeRuleConfig, setActiveRuleConfig] = useState<RuleConfig>(defaultRuleConfig);

  useEffect(() => {
    setLatestResult(readStorage<ClearingResult>(STORAGE_KEYS.marketResult, runMarketClearing(baselineScenario, defaultRuleConfig)));
    setActiveRuleConfig(readStorage<RuleConfig>(STORAGE_KEYS.ruleConfig, defaultRuleConfig));
  }, []);

  const scenarioData = useMemo(
    () =>
      compareScenarios(
        ruleTemplates.map((scenario) => ({
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          input: baselineScenario,
          ruleConfig: scenario.ruleConfig
        }))
      ),
    []
  );

  const activeParticipants = latestResult.participants.filter(
    (participant) => participant.awardedQuantity > 0
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle>结果分析</CardTitle>
            <Badge>自动读取最近一次仿真结果</Badge>
            <Badge variant="secondary">
              {activeRuleConfig.clearingMechanism === "uniformPrice" ? "统一出清价" : "按报价支付"}
            </Badge>
          </div>
          <CardDescription>图表聚焦报价结构、成交电量、主体收益与规则模板之间的差异。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <AnalysisMetric label="最新出清电价" value={`${latestResult.clearingPrice} 元/MWh`} />
          <AnalysisMetric label="用户购电成本" value={`${latestResult.customerPurchaseCost} 元`} />
          <AnalysisMetric label="社会福利" value={`${latestResult.socialWelfare} 元`} />
          <AnalysisMetric label="新能源消纳率" value={`${(latestResult.renewableConsumptionRate * 100).toFixed(2)}%`} />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <BidCurveChart data={activeParticipants} />
        <AwardChart data={activeParticipants} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProfitChart data={activeParticipants} />
        <ScenarioCompareChart data={scenarioData} />
      </div>
    </div>
  );
}

function AnalysisMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
