import { ExperimentsPanel } from "@/components/research/experiments-panel";
import { Badge } from "@/components/ui/badge";

export default function ExperimentResultsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>实验结果</Badge>
        <h2 className="text-3xl font-semibold text-white">实验结果与参数扫描结果</h2>
        <p className="max-w-3xl text-slate-300">
          展示数据库中的实验版本、运行记录、组合实验结果总览表与对比图表，便于复现实验过程与追踪结果演进。
        </p>
      </div>
      <ExperimentsPanel />
    </div>
  );
}
