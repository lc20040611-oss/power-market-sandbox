import { StoragePanel } from "@/components/china/storage-panel";
import { Badge } from "@/components/ui/badge";

export default function StoragePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>储能参与市场</Badge>
        <h2 className="text-3xl font-semibold text-white">储能参与市场分析</h2>
        <p className="max-w-3xl text-slate-300">
          采用简化峰谷套利策略，展示 SOC、充放电功率、峰谷电价与储能净收益。
        </p>
      </div>
      <StoragePanel />
    </div>
  );
}
