import { AlertTriangle, Clock, MapPin, Radio, Shield, Users } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import InfoHint from '@/components/ui/info-hint'

import type { PipelineResult, PlannedEvent } from '../../types'

/**
 * Command Brief — a 5-second, plain-language situation summary fusing the whole
 * pipeline output into what a commander would radio out: severity, clear-by time
 * (with live countdown), spread reach, backlog, action deadline, and the
 * recommended deployment. Entirely derived from existing metrics — no ML changes.
 */
interface Props {
  pipelineResult: PipelineResult
  event: PlannedEvent | null
}

const SEV_ACCENT: Record<string, { border: string; text: string; bg: string }> = {
  low: { border: 'border-l-green', text: 'text-green', bg: 'bg-green/10' },
  medium: { border: 'border-l-yellow', text: 'text-yellow', bg: 'bg-yellow/10' },
  high: { border: 'border-l-orange', text: 'text-orange', bg: 'bg-orange/10' },
  critical: { border: 'border-l-red', text: 'text-red', bg: 'bg-red/10' },
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function junctionsByT30(forecast: Record<string, unknown>): number {
  const state = forecast?.['T+30min'] ?? forecast?.['T+15min'] ?? forecast?.['T+5min']
  if (!state || typeof state !== 'object') return 0
  const nodes = (state as { activeNodes?: Record<string, unknown> }).activeNodes
  return nodes && typeof nodes === 'object' ? Object.keys(nodes).length : 0
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[13px] leading-snug text-foreground">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

export default function CommandBriefCard({ pipelineResult, event }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])

  const p = pipelineResult.prediction
  const q = pipelineResult.queue_analysis
  const sevLabel = (p.severity_label || 'Low').toLowerCase()
  const accent = SEV_ACCENT[sevLabel] || SEV_ACCENT.low

  const forecastMin = Math.round(p.duration_mins)
  const upperMin =
    typeof p.prediction_interval?.upper_mins === 'number'
      ? Math.round(p.prediction_interval.upper_mins)
      : null

  // Clear-by clock time + live countdown.
  const start = event?.start_datetime ? new Date(event.start_datetime) : null
  const startValid = start && !Number.isNaN(start.getTime())
  const clearBy = startValid ? new Date(start!.getTime() + forecastMin * 60000) : null
  const worstClear = startValid && upperMin ? new Date(start!.getTime() + upperMin * 60000) : null

  let countdown = ''
  if (startValid && clearBy) {
    if (now < start!.getTime()) {
      countdown = `starts in ${Math.round((start!.getTime() - now) / 60000)} min`
    } else if (now < clearBy.getTime()) {
      countdown = `clears in ~${Math.max(0, Math.round((clearBy.getTime() - now) / 60000))} min`
    } else {
      countdown = `overdue by ${Math.round((now - clearBy.getTime()) / 60000)} min`
    }
  }

  const junctions = junctionsByT30(pipelineResult.propagation_forecast)
  const vehicles = Math.round(q?.tandem?.total_queued_vehicles || q?.expected_queue_length || 0)
  const spillover = typeof q?.time_to_spillover === 'number' ? q.time_to_spillover : -1

  const officers = pipelineResult.fleet_plan?.total_fleet_required ?? 0
  const barricades = pipelineResult.barricade_plan?.barricades?.length ?? 0
  const route = pipelineResult.diversion_plan?.routes?.[0]

  const confLabel =
    typeof p.confidence !== 'number'
      ? null
      : p.confidence < 0.41
        ? 'low'
        : p.confidence < 0.52
          ? 'medium'
          : 'high'

  return (
    <Card className={`border-l-4 ${accent.border}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Radio size={16} /> Command Brief
          <InfoHint
            title="Command Brief"
            what="A one-glance situation summary for this incident — when it clears, how far it spreads, and what to deploy."
            why="Gives a commander everything to act on (and to radio to field staff) without reading every panel."
          />
          <span
            className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${accent.bg} ${accent.text}`}
          >
            {p.severity_label} priority
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Headline: clear-by time + live countdown */}
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {clearBy ? (
              <>
                Clear by {fmtTime(clearBy)}{' '}
                <span className="text-base font-semibold text-muted-foreground">
                  · {forecastMin} min predicted
                </span>
              </>
            ) : (
              `~${forecastMin} min to clear`
            )}
          </span>
          {countdown && (
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${accent.bg} ${accent.text}`}
            >
              {countdown}
            </span>
          )}
          {worstClear && (
            <span className="text-xs text-muted-foreground">worst case ~{fmtTime(worstClear)}</span>
          )}
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Fact icon={<Clock size={14} />}>
            Expected clearance <span className="font-semibold">{forecastMin} min</span>
            {upperMin ? ` (could run to ${upperMin} min)` : ''}.
          </Fact>
          <Fact icon={<AlertTriangle size={14} />}>
            Spreads to{' '}
            <span className="font-semibold">
              {junctions} junction{junctions === 1 ? '' : 's'}
            </span>{' '}
            within 30 min · ~<span className="font-semibold">{vehicles}</span> vehicles backed up.
          </Fact>
          {spillover > 0 && (
            <Fact icon={<Shield size={14} />}>
              <span className={`font-semibold ${accent.text}`}>
                Act within {spillover.toFixed(0)} min
              </span>{' '}
              before the queue spills into the next junction.
            </Fact>
          )}
          <Fact icon={<Users size={14} />}>
            Deploy{' '}
            <span className="font-semibold">
              {officers} officer{officers === 1 ? '' : 's'}
            </span>
            {barricades > 0 ? ` + ${barricades} barricade${barricades === 1 ? '' : 's'}` : ''}.
          </Fact>
          {route && (
            <Fact icon={<MapPin size={14} />}>
              Divert <span className="font-semibold">{route.at_risk_corridor}</span> → via{' '}
              <span className="font-semibold">{route.via_corridor}</span>.
            </Fact>
          )}
        </div>

        {confLabel && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Model agreement on this forecast:{' '}
            <span className="font-semibold capitalize">{confLabel}</span>
            {confLabel === 'low' ? ' — keep extra units on standby.' : '.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
