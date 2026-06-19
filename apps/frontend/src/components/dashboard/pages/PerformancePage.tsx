import { GitBranch, Users } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import DeploymentTable from '../../analysis/DeploymentTable'
import DeploymentBarChart from '../../charts/DeploymentBarChart'
import type { DashboardOutletContext } from '../AppLayout'

export default function PerformancePage() {
  const { pipelineResult } = useOutletContext<DashboardOutletContext>()

  if (!pipelineResult) {
    return (
      <div className="h-full overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Performance Metrics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resource deployment and signal gating impact
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Users size={28} className="opacity-50" />
            <p className="text-sm font-medium">No event selected</p>
            <span className="text-xs">Plan a new event or select one from the control panel</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { deployment_plan, gating_plan } = pipelineResult

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Performance Metrics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resource deployment and signal gating impact
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users size={16} /> Deployment by Junction
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {deployment_plan.recommendations.length > 0 ? (
              <DeploymentBarChart items={deployment_plan.recommendations} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No deployments recommended
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users size={16} /> Resource Deployment Detail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DeploymentTable plan={deployment_plan} />
          </CardContent>
        </Card>

        {gating_plan.recommendations.length > 0 && (
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <GitBranch size={16} /> Signal Gating Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5">
                {gating_plan.recommendations.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-input p-2.5 text-xs"
                  >
                    <span className="flex-1 font-medium">{g.junction_name}</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-muted-foreground">{g.current_green_secs}s</span>
                      <span className="text-yellow">&rarr;</span>
                      <span className="font-semibold text-yellow">{g.recommended_green_secs}s</span>
                    </div>
                    <span className="min-w-[70px] text-right font-mono text-[11px] font-semibold text-red">
                      -{g.reduction_pct.toFixed(0)}% green
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
