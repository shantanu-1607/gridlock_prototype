import { Construction, GitBranch, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import InfoHint from '@/components/ui/info-hint'

import BarrierRecommendationCard from '../../analysis/BarrierRecommendationCard'
import FleetRecommendationCard from '../../analysis/FleetRecommendationCard'
import DeploymentBarChart from '../../charts/DeploymentBarChart'
import type { DashboardOutletContext } from '../AppLayout'

export default function PerformancePage() {
  const { pipelineResult, selectedEventAssignments } = useOutletContext<DashboardOutletContext>()
  const { t } = useTranslation()

  if (!pipelineResult) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight">{t('performancePage.title')}</h1>
          <p className="text-base text-muted-foreground mt-1">{t('performancePage.subtitle')}</p>
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

  // Merge live assignments into the fleet plan so the Performance page reflects real dispatched fleet
  const mergedDeployments = (fleet_plan.deployments || []).map((d) => ({
    ...d,
    assignedFleet: [...(d.assignedFleet || [])],
  }))

  if (selectedEventAssignments && selectedEventAssignments.length > 0) {
    selectedEventAssignments.forEach((assignment) => {
      const existing = mergedDeployments.find(
        (d) =>
          (d.junctionName === assignment.junction_name ||
            d.junction === assignment.junction_name) &&
          d.role === assignment.role,
      )

      if (existing) {
        const alreadyAssigned = existing.assignedFleet.some((f) => f.user_id === assignment.user_id)
        if (!alreadyAssigned) {
          existing.assignedFleet.push({
            user_id: assignment.user_id,
            user_name: assignment.user_name || 'Unknown Officer',
          })
          existing.fleet_count = Math.max(existing.fleet_count, existing.assignedFleet.length)
        }
      } else {
        mergedDeployments.push({
          junction: assignment.junction_name,
          junctionName: assignment.junction_name,
          fleet_count: 1,
          role: assignment.role,
          priority: assignment.priority || 'Medium',
          deployByMins: 0,
          assignedFleet: [
            {
              user_id: assignment.user_id,
              user_name: assignment.user_name || 'Unknown Officer',
            },
          ],
        })
      }
    })
  }

  const mergedFleetPlan = {
    ...fleet_plan,
    deployments: mergedDeployments,
    total_fleet_required: Math.max(
      fleet_plan.total_fleet_required || 0,
      mergedDeployments.reduce((sum, d) => sum + d.fleet_count, 0),
    ),
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('performancePage.title')}</h1>
        <p className="text-base text-muted-foreground mt-1">{t('performancePage.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users size={20} /> {t('performancePage.deploymentByJunction')}
              <InfoHint
                title="Deployment by Junction"
                what="How many officers and barricades are recommended at each junction."
                why="Helps you place limited staff where they will have the most impact."
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {mergedFleetPlan.deployments?.length ? (
              <DeploymentBarChart items={mergedFleetPlan.deployments} />
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
              <Users size={20} /> {t('performancePage.fleetDeploymentDetail')}
              <InfoHint
                title="Fleet Deployment Detail"
                what="Which officers are being sent where, and the reasoning behind it."
                why="Gives the on-ground reasoning behind each assignment, so commanders can trust or adjust it."
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FleetRecommendationCard plan={mergedFleetPlan} />
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Construction size={20} /> {t('performancePage.barricadePlan')}
              <InfoHint
                title="Barricade Plan"
                what="Where to place barricades or road closures for this incident."
                why="Stops more vehicles entering the jam while the incident is being cleared."
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarrierRecommendationCard plan={barricade_plan} />
          </CardContent>
        </Card>

        {gating_plan.recommendations?.length ? (
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch size={20} /> {t('performancePage.signalGatingRecommendations')}
                <InfoHint
                  title="Signal Gating Recommendations"
                  what="Suggested cuts to traffic-signal green time at junctions upstream of the incident."
                  why="Metering the inflow buys time for the incident to clear and keeps the backlog from growing."
                />
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
