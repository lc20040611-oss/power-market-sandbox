import roles from "@/data/roles.json";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketRole } from "@/lib/types";

export default function RolesPage() {
  const roleCards = roles as MarketRole[];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge>角色选择页面</Badge>
        <h2 className="text-3xl font-semibold text-white">市场参与者画像</h2>
        <p className="max-w-3xl text-slate-300">
          用统一模板呈现目标函数、可操作行为和收益来源，便于在规则仿真中切换主体视角。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {roleCards.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <Badge variant="secondary">{role.name}</Badge>
              <CardTitle>{role.name}</CardTitle>
              <CardDescription>{role.objective}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="mb-3 text-sm font-medium text-white">可操作行为</p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {role.actions.map((action) => (
                    <li key={action}>• {action}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="mb-3 text-sm font-medium text-white">收益来源</p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {role.revenueSources.map((source) => (
                    <li key={source}>• {source}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
