import { ContractsPanel } from "@/components/china/contracts-panel";
import { Badge } from "@/components/ui/badge";

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>中长期合约</Badge>
        <h2 className="text-3xl font-semibold text-white">中长期合约与现货偏差结算</h2>
        <p className="max-w-3xl text-slate-300">
          分解中长期合约收益、现货偏差电量与偏差结算金额，观察合约覆盖率对主体收益结构的影响。
        </p>
      </div>
      <ContractsPanel />
    </div>
  );
}
