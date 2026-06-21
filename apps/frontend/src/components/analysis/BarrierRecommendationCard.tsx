import { AlertTriangle, CheckCircle2, Construction, MapPin, ShieldAlert } from 'lucide-react'

import type { BarricadePlan } from '../../types'

interface Props {
  plan: BarricadePlan
  eventStatus?: string
}

export default function BarrierRecommendationCard({ plan, eventStatus }: Props) {
  if (!plan || !plan.barricades) return null

  const isDemobilized = eventStatus === 'resolved' || eventStatus === 'closed'
  const isHighResourceLoad = plan.barricades.length > 4

  return (
    <div className="flex flex-col gap-3">
      {isHighResourceLoad && !isDemobilized && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-yellow-500">
          <AlertTriangle size={14} />
          <span className="text-xs font-bold uppercase tracking-wider">
            High Resource Load: {plan.barricades.length} Units Requested
          </span>
        </div>
      )}

      {/* Overview Stat */}
      <div
        className={`flex items-center gap-3 rounded-md bg-muted px-3 py-2.5 border border-border ${isDemobilized ? 'text-green-500' : 'text-orange-500'}`}
      >
        {isDemobilized ? <CheckCircle2 size={18} /> : <Construction size={18} />}
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold">{plan.barricades.length}</span>
          <span className="text-sm tracking-wider text-muted-foreground uppercase">
            {isDemobilized ? 'Barricades Ready to Lift' : 'Barricades Recommended'}
          </span>
        </div>
      </div>

      {/* Rationale */}
      {plan.rationale && (
        <div className="rounded-md border border-orange/20 bg-orange/5 px-2.5 py-2 text-sm leading-relaxed text-foreground">
          <span className="font-semibold block mb-1 text-orange">Barricade Strategy:</span>
          {plan.rationale}
        </div>
      )}

      {/* Barricades List */}
      <div className="flex flex-col gap-1.5 mt-1">
        {plan.barricades.map((b, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-md border border-border bg-card p-2.5 text-sm transition-colors hover:border-orange/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin size={12} className="text-muted-foreground" />
                  {b.location_name}
                </span>
                <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                  <ShieldAlert size={10} className="text-orange/70" />
                  {b.type.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-1.5 py-0.5 rounded-[4px] text-xs font-bold uppercase tracking-wider ${isDemobilized ? 'bg-green-500/10 text-green-500' : 'bg-orange/10 text-orange'}`}
                >
                  {b.rule_source.replace(/_/g, ' ')}
                </span>
                <span
                  className={`font-mono text-xs ${isDemobilized ? 'text-green-500 font-bold' : 'text-muted-foreground'}`}
                >
                  {isDemobilized ? 'Safe to Lift' : `Activate: ${b.activate_at}`}
                </span>
              </div>
            </div>

            <div className="rounded border border-muted-foreground/20 bg-muted/50 px-2 py-1.5 text-sm text-muted-foreground leading-snug">
              <span className="font-semibold text-foreground mr-1">Purpose:</span>
              {b.purpose}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
