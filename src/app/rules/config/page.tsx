import { Badge } from "@/components/ui/badge";
import { RuleConfigPanel } from "@/components/rules/rule-config-panel";

export default function RuleConfigPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>规则参数配置</Badge>
        <h2 className="text-3xl font-semibold text-white">规则配置与场景对比</h2>
        <p className="max-w-3xl text-slate-300">
          调整出清机制、偏差考核、新能源消纳与容量补偿参数，并基于同一组市场输入比较不同规则情景。
        </p>
      </div>
      <RuleConfigPanel />
    </div>
  );
}
