import { ArrowRight, ShieldCheck } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import InfoHint from '@/components/ui/info-hint'

import type { PipelineResult } from '../../types'

/**
 * Intervention Impact — proves the *value* of acting on the plan by comparing the
 * congestion spread with no action vs. with the recommended barricades. Both numbers
 * come from the same Graph-BFS propagation engine (one run no-intervention, one with
 * the barricade nodes applied), so this is a real, honest comparison — not a guess.
 *
 * Renders only when the backend supplied a meaningful comparison; otherwise hides,
 * so older/stored events or no-barricade cases are unaffected.
 */
interface Props {
  pipelineResult: PipelineResult
}

export default function InterventionImpactCard({ pipelineResult }: Props) {
  const impact = pipelineResult.intervention_impact
  if (!impact || impact.junctions_prevented <= 0) return null

  const { without_junctions, with_junctions, junctions_prevented, reduction_pct } = impact

  return (
    <Card className="border-l-4 border-l-green">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck size={16} /> Intervention Impact
          <InfoHint
            title="Intervention Impact"
            what="How much less the congestion spreads if you act on the recommended barricade plan, compared to doing nothing."
            why="Shows the concrete payoff of the plan — fewer junctions choked — so commanders can justify deploying resources."
          />
          <span className="ml-auto rounded-full bg-green/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-green">
            {reduction_pct}% less spread
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          {/* Do nothing */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-3xl font-bold text-red">{without_junctions}</span>
            <span className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              junctions if no action
            </span>
          </div>

          <ArrowRight size={22} className="shrink-0 text-muted-foreground" />

          {/* With plan */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-3xl font-bold text-green">{with_junctions}</span>
            <span className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
              with the plan
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-[13px] leading-relaxed text-foreground">
          Acting on the recommended barricades is projected to{' '}
          <span className="font-semibold text-green">
            keep {junctions_prevented} junction{junctions_prevented === 1 ? '' : 's'} clear
          </span>{' '}
          that would otherwise have choked within 30 minutes.
        </p>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          Both figures from the same propagation simulation — with vs. without the barricade plan.
        </p>
      </CardContent>
    </Card>
  )
}
