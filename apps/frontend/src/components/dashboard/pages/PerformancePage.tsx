import { Construction, GitBranch, Users } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import BarrierRecommendationCard from '../../analysis/BarrierRecommendationCard'
import FleetRecommendationCard from '../../analysis/FleetRecommendationCard'
import DeploymentBarChart from '../../charts/DeploymentBarChart'
import type { DashboardOutletContext } from '../AppLayout'

export default function PerformancePage() {
  const { pipelineResult } = useOutletContext<DashboardOutletContext>()

  if (!pipelineResult) {
    return (
      <div className="h-full overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">Performance Metrics</h1>
          <p className="text-base text-muted-foreground mt-1">
            Resource deployment and signal gating impact
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Users size={32} className="opacity-50" />
            <p className="text-lg font-medium">No event selected</p>
            <span className="text-sm">Plan a new event or select one from the control panel</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { fleet_plan, barricade_plan, gating_plan } = pipelineResult

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Performance Metrics</h1>
        <p className="text-base text-muted-foreground mt-1">
          Resource deployment and signal gating impact
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users size={20} /> Deployment by Junction
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {fleet_plan.deployments?.length ? (
              <DeploymentBarChart items={fleet_plan.deployments} />
            ) : (
              <div className="flex h-full items-center justify-center text-lg text-muted-foreground">
                No deployments recommended
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users size={20} /> Fleet Deployment Detail
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FleetRecommendationCard plan={fleet_plan} />
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Construction size={20} /> Barricade Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarrierRecommendationCard plan={barricade_plan} />
          </CardContent>
        </Card>

        {gating_plan.recommendations?.length ? (
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch size={20} /> Signal Gating Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5">
                {gating_plan.recommendations.map((g, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-input p-3.5 text-base"
                  >
                    <span className="flex-1 font-medium">{g.junction_name}</span>
                    <div className="flex items-center gap-2.5 font-mono">
                      <span className="text-muted-foreground">{g.current_green_secs}s</span>
                      <span className="text-yellow">&rarr;</span>
                      <span className="font-semibold text-yellow">{g.recommended_green_secs}s</span>
                    </div>
                    <span className="min-w-[90px] text-right font-mono text-sm font-semibold text-red">
                      -{g.reduction_pct.toFixed(0)}% green
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
