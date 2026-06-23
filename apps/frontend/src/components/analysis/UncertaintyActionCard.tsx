import { ShieldAlert, Target } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import InfoHint from '@/components/ui/info-hint'

import type { PipelineResult } from '../../types'

/**
 * Uncertainty-Aware Action Plan — turns the calibrated 90% prediction interval into
 * a staffing posture. Instead of trusting a single point estimate, it tells the
 * commander to plan a baseline AND prepare for the long-tail (P90) scenario.
 * Built entirely from existing outputs (prediction + conformal interval + confidence).
 */
interface Props {
  pipelineResult: PipelineResult
}

export default function UncertaintyActionCard({ pipelineResult }: Props) {
  const p = pipelineResult.prediction
  const predicted = Math.round(p.duration_mins)
  const lower =
    typeof p.prediction_interval?.lower_mins === 'number'
      ? Math.round(p.prediction_interval.lower_mins)
      : null
  const upper =
    typeof p.prediction_interval?.upper_mins === 'number'
      ? Math.round(p.prediction_interval.upper_mins)
      : null
  const coverage = Math.round((p.prediction_interval?.coverage ?? 0.9) * 100)
  const conf = typeof p.confidence === 'number' ? p.confidence : null

  if (lower === null || upper === null) {
    return null // no interval → nothing meaningful to show
  }

  const widthRatio = predicted > 0 ? upper / predicted : 1
  const highUncertainty = (conf !== null && conf < 0.41) || widthRatio >= 3
  const moderate = !highUncertainty && widthRatio >= 1.8

  const posture = highUncertainty
    ? {
        tag: 'High uncertainty',
        cls: 'text-orange',
        bg: 'bg-orange/10',
        advice: `Wide outcome range — staff for the worst-case ${upper} min, not just ${predicted}. Pre-stage contingency units now; stand them down early if it clears fast.`,
      }
    : moderate
      ? {
          tag: 'Moderate uncertainty',
          cls: 'text-yellow',
          bg: 'bg-yellow/10',
          advice: `Plan for ${predicted} min, but keep one reserve unit ready in case it runs toward ${upper} min.`,
        }
      : {
          tag: 'Tight forecast',
          cls: 'text-green',
          bg: 'bg-green/10',
          advice: `Outcome range is narrow — deploy for ~${predicted} min with normal contingency.`,
        }

  // Band geometry: position predicted within [lower, upper].
  const span = Math.max(1, upper - lower)
  const predPct = Math.max(2, Math.min(98, ((predicted - lower) / span) * 100))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldAlert size={16} /> Uncertainty-Aware Action Plan
          <InfoHint
            title="Uncertainty-Aware Action Plan"
            what={`The likely range for how long this incident takes, and how to staff for it. ${coverage}% of similar incidents land inside this range.`}
            why="A single estimate can be wrong; planning for the realistic range (not just the average) avoids being caught short on a long incident."
          />
          <span
            className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${posture.bg} ${posture.cls}`}
          >
            {posture.tag}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Range band: lower — predicted — upper */}
        <div className="mb-2 flex items-end justify-between font-mono text-xs text-muted-foreground">
          <span>
            {lower} min
            <br />
            <span className="text-[10px]">best case</span>
          </span>
          <span className="text-center text-foreground">
            <span className="text-lg font-bold">{predicted} min</span>
            <br />
            <span className="text-[10px] text-muted-foreground">plan baseline</span>
          </span>
          <span className="text-right">
            {upper} min
            <br />
            <span className="text-[10px]">stress case (P{coverage})</span>
          </span>
        </div>
        <div className="relative mb-4 h-2.5 rounded-full bg-gradient-to-r from-green/40 via-yellow/40 to-red/50">
          <div
            className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-foreground shadow"
            style={{ left: `${predPct}%` }}
            title={`Predicted ${predicted} min`}
          />
        </div>

        <div
          className={`flex items-start gap-2 rounded-md ${posture.bg} p-3 text-[13px] leading-relaxed`}
        >
          <Target size={15} className={`mt-0.5 shrink-0 ${posture.cls}`} />
          <span className="text-foreground">
            <span className={`font-semibold ${posture.cls}`}>Recommended posture: </span>
            {posture.advice}
          </span>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground">
          This {coverage}% range is calibrated — historically about {coverage} out of 100 incidents
          actually fall within it.
        </p>
      </CardContent>
    </Card>
  )
}
