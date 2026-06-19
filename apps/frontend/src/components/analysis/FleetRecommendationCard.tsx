import { Navigation, ShieldAlert, Users } from 'lucide-react'

import type { DispatchPlan } from '../../types'

interface Props {
  plan: DispatchPlan
}

export default function FleetRecommendationCard({ plan }: Props) {
  if (!plan || !plan.deployments) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Overview Stat */}
      <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5 text-primary border border-border">
        <Users size={18} className="text-primary" />
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold">{plan.total_fleet_required}</span>
          <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
            Officers Dispatched
          </span>
        </div>
      </div>

      {/* Rationale */}
      {plan.rationale && (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-[11px] leading-relaxed text-foreground">
          <span className="font-semibold block mb-1 text-primary">Strategic Rationale:</span>
          {plan.rationale}
        </div>
      )}

      {/* Deployments List */}
      <div className="flex flex-col gap-1.5 mt-1">
        {plan.deployments.map((d, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-md border border-border bg-card p-2.5 text-xs transition-colors hover:border-primary/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Navigation size={12} className="text-muted-foreground" />
                  {d.junctionName}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {d.role.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${
                    d.priority === 'Critical'
                      ? 'bg-red/10 text-red'
                      : d.priority === 'High'
                        ? 'bg-orange/10 text-orange'
                        : d.priority === 'Medium'
                          ? 'bg-yellow/10 text-yellow'
                          : 'bg-green/10 text-green'
                  }`}
                >
                  {d.priority} Priority
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Deploy in {d.deployByMins}m
                </span>
              </div>
            </div>

            {d.assignedFleet.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {d.assignedFleet.map((f, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground"
                  >
                    <ShieldAlert size={10} className="text-primary/70" />
                    {f.user_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
