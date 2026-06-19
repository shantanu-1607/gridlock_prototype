import { Construction, MapPin, ShieldAlert } from 'lucide-react'

import type { BarricadePlan } from '../../types'

interface Props {
  plan: BarricadePlan
}

export default function BarrierRecommendationCard({ plan }: Props) {
  if (!plan || !plan.barricades) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Overview Stat */}
      <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2.5 text-orange border border-border">
        <Construction size={18} className="text-orange" />
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold">{plan.barricades.length}</span>
          <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
            Barricades Recommended
          </span>
        </div>
      </div>

      {/* Rationale */}
      {plan.rationale && (
        <div className="rounded-md border border-orange/20 bg-orange/5 px-2.5 py-2 text-[11px] leading-relaxed text-foreground">
          <span className="font-semibold block mb-1 text-orange">Barricade Strategy:</span>
          {plan.rationale}
        </div>
      )}

      {/* Barricades List */}
      <div className="flex flex-col gap-1.5 mt-1">
        {plan.barricades.map((b, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-md border border-border bg-card p-2.5 text-xs transition-colors hover:border-orange/50"
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin size={12} className="text-muted-foreground" />
                  {b.location_name}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
                  <ShieldAlert size={10} className="text-orange/70" />
                  {b.type.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider bg-orange/10 text-orange">
                  {b.rule_source.replace(/_/g, ' ')}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Activate: {b.activate_at}
                </span>
              </div>
            </div>

            <div className="rounded border border-muted-foreground/20 bg-muted/50 px-2 py-1.5 text-[10px] text-muted-foreground leading-snug">
              <span className="font-semibold text-foreground mr-1">Purpose:</span>
              {b.purpose}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
