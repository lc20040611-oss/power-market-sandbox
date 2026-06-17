import { CapacityPanel } from "@/components/china/capacity-panel";
import { Badge } from "@/components/ui/badge";

export default function CapacityPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>容量机制</Badge>
        <h2 className="text-3xl font-semibold text-white">容量补偿机制分析</h2>
        <p className="max-w-3xl text-slate-300">
          对比无容量补偿、固定容量补偿和容量市场模拟三种机制下的收益、成本与可靠性变化。
        </p>
      </div>
      <CapacityPanel />
    </div>
  );
}
