import { Construction, Users } from 'lucide-react'

import type { DeploymentPlan } from '../../types'

interface Props {
  plan: DeploymentPlan
}

export default function DeploymentTable({ plan }: Props) {
  return (
    <div>
      <div className="mb-3 flex gap-4">
        <div className="flex flex-1 items-center gap-2 rounded-md bg-bg-input px-3 py-2.5 text-accent">
          <Users size={18} />
          <span className="font-mono text-xl font-bold">{plan.total_officers_deployed}</span>
          <span className="text-[11px] tracking-wider text-text-muted uppercase">Officers</span>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-md bg-bg-input px-3 py-2.5 text-accent">
          <Construction size={18} />
          <span className="font-mono text-xl font-bold">{plan.total_barricades_deployed}</span>
          <span className="text-[11px] tracking-wider text-text-muted uppercase">Barricades</span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_2fr] gap-2 border-b border-border-default px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-text-muted uppercase">
          <span>Junction</span>
          <span>Officers</span>
          <span>Barricades</span>
          <span>Impact</span>
        </div>

        {/* Rows */}
        {plan.recommendations.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-[2fr_1fr_1fr_2fr] items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-bg-input"
          >
            <span className="truncate font-medium">{r.junction_name || r.junction_id}</span>
            <span className="text-center font-mono font-semibold">{r.officers}</span>
            <span className="text-center font-mono font-semibold">{r.barricades}</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-green">
              <div
                className="h-1 rounded-full bg-green transition-all duration-500 ease-out"
                style={{ width: `${Math.min(r.expected_improvement_pct, 100)}%` }}
              />
              <span>{r.expected_improvement_pct.toFixed(0)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
