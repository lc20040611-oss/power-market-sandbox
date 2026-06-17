import { RenewablesPanel } from "@/components/china/renewables-panel";
import { Badge } from "@/components/ui/badge";

export default function RenewablesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>新能源消纳</Badge>
        <h2 className="text-3xl font-semibold text-white">新能源消纳与弃风弃光分析</h2>
        <p className="max-w-3xl text-slate-300">
          对比不同渗透率和波动场景下的新能源消纳率、弃风弃光电量及补贴收益变化。
        </p>
      </div>
      <RenewablesPanel />
    </div>
  );
}
