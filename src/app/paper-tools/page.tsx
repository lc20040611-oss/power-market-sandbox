import { PaperToolsPanel } from "@/components/research/paper-tools-panel";
import { Badge } from "@/components/ui/badge";

export default function PaperToolsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>论文工具</Badge>
        <h2 className="text-3xl font-semibold text-white">论文图表与研究报告草稿</h2>
        <p className="max-w-3xl text-slate-300">
          从实验结果中直接生成论文图表、自动分析文字和 Markdown 报告草稿。
        </p>
      </div>
      <PaperToolsPanel />
    </div>
  );
}
