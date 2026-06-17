import { MarketPowerPanel } from "@/components/china/market-power-panel";
import { Badge } from "@/components/ui/badge";

export default function MarketPowerPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>市场力分析</Badge>
        <h2 className="text-3xl font-semibold text-white">市场集中度与策略报价分析</h2>
        <p className="max-w-3xl text-slate-300">
          展示市场份额、HHI、RSI 以及策略报价前后的电价变化，并给出市场力风险提示。
        </p>
      </div>
      <MarketPowerPanel />
    </div>
  );
}
