import { Badge } from "@/components/ui/badge";
import { SimulationWorkbench } from "@/components/simulation/simulation-workbench";

export default function SimulationPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>市场仿真页面</Badge>
        <h2 className="text-3xl font-semibold text-white">多时段市场仿真实验台</h2>
        <p className="max-w-3xl text-slate-300">
          输入发电企业报价、申报电量、负荷需求、新能源预测出力与储能参数，运行多时段出清和储能时序优化。
        </p>
      </div>
      <SimulationWorkbench />
    </div>
  );
}
