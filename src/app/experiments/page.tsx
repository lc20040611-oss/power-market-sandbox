import { ExperimentsPanel } from "@/components/research/experiments-panel";
import { Badge } from "@/components/ui/badge";

export default function ExperimentsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>实验管理</Badge>
        <h2 className="text-3xl font-semibold text-white">实验管理与参数扫描</h2>
        <p className="max-w-3xl text-slate-300">
          创建研究实验、批量扫描关键参数、记录运行结果，并为论文分析提供结构化实验数据。
        </p>
      </div>
      <ExperimentsPanel />
    </div>
  );
}
