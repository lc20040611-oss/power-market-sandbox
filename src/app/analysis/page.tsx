import { AnalysisPanel } from "@/components/analysis/analysis-panel";
import { Badge } from "@/components/ui/badge";

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>结果分析页面</Badge>
        <h2 className="text-3xl font-semibold text-white">图表化分析视图</h2>
        <p className="max-w-3xl text-slate-300">
          展示报价曲线、成交结果、主体收益，以及不同规则情景对出清价格与社会福利的影响。
        </p>
      </div>
      <AnalysisPanel />
    </div>
  );
}
