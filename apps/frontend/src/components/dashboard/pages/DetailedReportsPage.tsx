import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileBarChart,
  GitCompare,
  Info,
  Lightbulb,
  MapPin,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import React from 'react'
import { useOutletContext } from 'react-router-dom'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

import Timeline from '../../analysis/Timeline'
import type { DashboardOutletContext } from '../AppLayout'

// ─── Helpers ────────────────────────────────────────────────────────────────

function similarityBar(score: number) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 85
      ? 'bg-emerald-500'
      : pct >= 70
        ? 'bg-amber-400'
        : pct >= 55
          ? 'bg-orange-400'
          : 'bg-slate-400'
  return { pct, color }
}

function causeLabel(raw: string) {
  return raw
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Maps event_cause to a human-readable icon emoji */
function causeIcon(raw: string) {
  const lower = raw.toLowerCase()
  if (lower.includes('accident') || lower.includes('crash')) return '💥'
  if (lower.includes('water') || lower.includes('flood')) return '🌊'
  if (lower.includes('tree') || lower.includes('debris')) return '🌳'
  if (lower.includes('breakdown') || lower.includes('vehicle')) return '🚗'
  if (lower.includes('vip') || lower.includes('convoy')) return '🚨'
  if (lower.includes('protest') || lower.includes('march')) return '📢'
  if (lower.includes('construction')) return '🚧'
  if (lower.includes('marathon') || lower.includes('race')) return '🏃'
  if (lower.includes('festival') || lower.includes('event')) return '🎉'
  return '⚠️'
}

function hourLabel(h: number) {
  if (h === 0) return 'Midnight'
  if (h < 6) return `${h}:00 AM – Early night`
  if (h < 9) return `${h}:00 AM – Morning rush`
  if (h < 12) return `${h}:00 AM – Mid-morning`
  if (h < 15) return `${h}:00 – Afternoon`
  if (h < 18) return `${h}:00 – Evening peak`
  if (h < 21) return `${h}:00 – Night`
  return `${h}:00 – Late night`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  badge?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon size={16} className="text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
  )
}

function MetricChip({
  label,
  value,
  delta,
  unit = '',
}: {
  label: string
  value: string | number
  delta?: 'up' | 'down' | 'neutral'
  unit?: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-center min-w-[100px]">
      <span className="font-mono text-2xl font-extrabold leading-none text-foreground">
        {value}
        <span className="text-sm font-medium text-muted-foreground ml-0.5">{unit}</span>
      </span>
      <div className="flex items-center justify-center gap-1">
        {delta === 'up' && <TrendingUp size={10} className="text-red-400" />}
        {delta === 'down' && <TrendingDown size={10} className="text-emerald-400" />}
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          {label}
        </span>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DetailedReportsPage() {
  const { pipelineResult, selectedEvent } = useOutletContext<DashboardOutletContext>()
  const counterfactual = selectedEvent?.counterfactual
  const eventName = selectedEvent?.name ?? 'Event'

  if (!pipelineResult) {
    return (
      <div className="h-full overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Detailed Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historical precedents, pre-staging timeline, and post-event analysis
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <FileBarChart size={24} className="opacity-40" />
            </div>
            <div>
              <p className="text-sm font-semibold">No event selected</p>
              <span className="text-xs text-muted-foreground">
                Plan a new event or select one from the control panel to view its report
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { similar_incidents, prestaging_timeline, prediction, queue_analysis } = pipelineResult
  const hasSimilar = similar_incidents && similar_incidents.length > 0
  const hasCounterfactual = counterfactual && counterfactual.prediction_accuracy_pct !== undefined
  const hasTimeline = prestaging_timeline && prestaging_timeline.length > 0

  // Accuracy quality label
  const accuracyPct = hasCounterfactual ? counterfactual.prediction_accuracy_pct : null
  const accuracyQuality =
    accuracyPct !== null
      ? accuracyPct >= 90
        ? { label: 'Excellent', color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
        : accuracyPct >= 75
          ? { label: 'Good', color: 'text-amber-500', bg: 'bg-amber-500/10' }
          : { label: 'Needs Review', color: 'text-red-400', bg: 'bg-red-400/10' }
      : null

  return (
    <div className="h-full overflow-y-auto p-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Detailed Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Post-event debrief for{' '}
            <span className="font-semibold text-foreground">{eventName}</span>
          </p>
        </div>
        {hasCounterfactual && accuracyQuality && (
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${accuracyQuality.bg} ${accuracyQuality.color}`}
          >
            <CheckCircle2 size={12} />
            {accuracyQuality.label} Prediction
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Section 1: Post-Event Analysis ──────────────────────────────── */}
        {hasCounterfactual && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <SectionHeader
                icon={Target}
                title="Post-Event Analysis"
                subtitle="How did the actual event compare to what was predicted?"
              />
            </CardHeader>
            <CardContent className="pt-2">
              {/* Top KPI strip */}
              <div className="flex flex-wrap gap-3 mb-6">
                <MetricChip
                  label="Predicted"
                  value={Math.round(counterfactual.predicted_duration_mins)}
                  unit="min"
                  delta="neutral"
                />
                <div className="flex items-center text-muted-foreground">
                  <ChevronRight size={18} />
                </div>
                <MetricChip
                  label="Actual"
                  value={Math.round(counterfactual.actual_duration_mins)}
                  unit="min"
                  delta={
                    counterfactual.actual_duration_mins > counterfactual.predicted_duration_mins
                      ? 'up'
                      : 'down'
                  }
                />
                <div className="flex items-center text-muted-foreground mx-1">·</div>
                <MetricChip
                  label="Model Accuracy"
                  value={`${counterfactual.prediction_accuracy_pct.toFixed(0)}%`}
                  delta={counterfactual.prediction_accuracy_pct >= 80 ? 'down' : 'up'}
                />
                <MetricChip
                  label="Policy Regret"
                  value={counterfactual.policy_regret.toFixed(2)}
                  delta={counterfactual.policy_regret < 1 ? 'down' : 'up'}
                />
              </div>

              {/* Policy regret explainer */}
              <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-primary/15 bg-primary/5 px-3.5 py-3">
                <Info size={14} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Policy Regret</span> measures how
                  much time could have been saved if the optimal response protocol had been chosen
                  from the start. A score below 1.0 means our deployed strategy was near-optimal.
                </p>
              </div>

              {/* What-if scenarios */}
              {counterfactual.scenarios.length > 0 && (
                <div>
                  <div className="mb-2.5 flex items-center gap-2">
                    <GitCompare size={13} className="text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      What-if Scenarios
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {counterfactual.scenarios.map((s, i) => {
                      const improved = s.improvement_pct > 0
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-[12px] transition-colors ${
                            improved
                              ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                              : 'border-red-400/20 bg-red-400/5 hover:bg-red-400/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {improved ? (
                              <TrendingDown size={14} className="text-emerald-500 shrink-0" />
                            ) : (
                              <TrendingUp size={14} className="text-red-400 shrink-0" />
                            )}
                            <div>
                              <span className="font-semibold text-foreground capitalize">
                                {causeLabel(s.scenario)}
                              </span>
                              <span className="ml-2 text-muted-foreground">
                                ~{Math.round(s.estimated_duration_mins)} min total
                              </span>
                            </div>
                          </div>
                          <div
                            className={`font-mono font-bold text-sm ${improved ? 'text-emerald-500' : 'text-red-400'}`}
                          >
                            {improved ? '−' : '+'}
                            {Math.abs(s.improvement_mins).toFixed(0)}m
                            <span className="ml-1 text-[10px] font-medium opacity-70">
                              ({Math.abs(s.improvement_pct).toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Best alternative */}
              {counterfactual.best_alternative && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-400/25 bg-amber-400/8 px-3.5 py-3">
                  <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-500" />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      Best Alternative Protocol
                    </span>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-foreground">
                      {causeLabel(counterfactual.best_alternative)}
                    </p>
                  </div>
                </div>
              )}

              {/* Recommendation */}
              {counterfactual.recommendation && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
                  <BookOpen size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Recommendation: </span>
                    {counterfactual.recommendation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Two-column row: Historical Precedents + Pre-staging Timeline ── */}
        <div className="grid grid-cols-2 gap-6">
          {/* Historical Precedents */}
          {hasSimilar && (
            <Card>
              <CardHeader className="pb-0">
                <SectionHeader
                  icon={BookOpen}
                  title="Historical Precedents"
                  subtitle={`${similar_incidents.length} past incident${similar_incidents.length > 1 ? 's' : ''} matched this event profile`}
                  badge={
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                      {similar_incidents.length} matched
                    </span>
                  }
                />
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex flex-col gap-3">
                  {similar_incidents.map((evt, i) => {
                    const { pct, color } = similarityBar(evt.similarity_score)
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-border bg-muted/30 p-3.5 transition-colors hover:bg-muted/60"
                      >
                        {/* Row 1: Icon + cause + similarity badge */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg leading-none">
                              {causeIcon(evt.event_cause)}
                            </span>
                            <div>
                              <span className="text-[13px] font-bold text-foreground">
                                {causeLabel(evt.event_cause)}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <MapPin size={10} className="text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {evt.corridor}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="font-mono text-sm font-extrabold text-primary">
                            {pct}%
                          </span>
                        </div>

                        {/* Similarity progress bar */}
                        <div className="relative mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Row 3: meta chips */}
                        <div className="flex gap-2 flex-wrap">
                          <span className="flex items-center gap-1 rounded bg-background border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                            <Clock size={9} />
                            {hourLabel(evt.hour)}
                          </span>
                          <span className="flex items-center gap-1 rounded bg-background border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                            <Activity size={9} />
                            {Math.round(evt.duration_mins)} min clearance
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Insight callout */}
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                  <Info size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Similarity is computed across incident type, corridor flow pattern, time-of-day,
                    and historical duration using k-NN embedding distance. Higher match → more
                    reliable prediction.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pre-staging Timeline */}
          {hasTimeline && (
            <Card className={!hasSimilar ? 'col-span-2' : ''}>
              <CardHeader className="pb-0">
                <SectionHeader
                  icon={Clock}
                  title="Pre-Staging Timeline"
                  subtitle="Ordered deployment actions with T-offset from event start"
                  badge={
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                      {prestaging_timeline.length} steps
                    </span>
                  }
                />
              </CardHeader>
              <CardContent className="pt-2">
                <Timeline steps={prestaging_timeline} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Section 3: Prediction Quality Breakdown ──────────────────────── */}
        <Card>
          <CardHeader className="pb-0">
            <SectionHeader
              icon={Activity}
              title="Prediction Quality Breakdown"
              subtitle="Model confidence indicators for this event's forecast"
            />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-3 gap-4">
              {/* Confidence score */}
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Confidence
                  </span>
                  {prediction.confidence >= 0.8 ? (
                    <CheckCircle2 size={13} className="text-emerald-500" />
                  ) : prediction.confidence >= 0.6 ? (
                    <AlertTriangle size={13} className="text-amber-500" />
                  ) : (
                    <XCircle size={13} className="text-red-400" />
                  )}
                </div>
                <span className="font-mono text-3xl font-extrabold leading-none text-foreground">
                  {(prediction.confidence * 100).toFixed(0)}
                  <span className="text-base font-medium text-muted-foreground">%</span>
                </span>
                {prediction.confidence_factors && (
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {prediction.confidence_factors.n_models}-model ensemble · σ ={' '}
                    {prediction.confidence_factors.ensemble_std.toFixed(2)}
                  </p>
                )}
                {/* Confidence bar */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      prediction.confidence >= 0.8
                        ? 'bg-emerald-500'
                        : prediction.confidence >= 0.6
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                    }`}
                    style={{ width: `${prediction.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Duration range */}
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Duration Estimate
                </span>
                <span className="font-mono text-3xl font-extrabold leading-none text-foreground">
                  {Math.round(prediction.duration_mins)}
                  <span className="text-base font-medium text-muted-foreground ml-0.5">min</span>
                </span>
                {prediction.prediction_interval?.lower_mins !== null &&
                prediction.prediction_interval?.upper_mins !== null ? (
                  <p className="text-[10px] text-muted-foreground">
                    Range:{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {Math.round(prediction.prediction_interval.lower_mins)}–
                      {Math.round(prediction.prediction_interval.upper_mins)} min
                    </span>{' '}
                    at {Math.round((prediction.prediction_interval.coverage ?? 0.9) * 100)}% CI
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No interval available</p>
                )}
              </div>

              {/* Queue risk */}
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Queue Risk
                </span>
                <div className="flex items-end gap-2">
                  <span className="font-mono text-3xl font-extrabold leading-none text-foreground">
                    {(queue_analysis.blocking_probability * 100).toFixed(0)}
                    <span className="text-base font-medium text-muted-foreground">%</span>
                  </span>
                  <span className="mb-0.5 text-[10px] text-muted-foreground capitalize">
                    block prob.
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Est. queue:{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {Math.round(queue_analysis.expected_queue_length)} veh
                  </span>
                  {queue_analysis.time_to_spillover > 0 && (
                    <>
                      {' '}
                      · spillover in{' '}
                      <span className="font-mono font-semibold text-orange-400">
                        {Math.round(queue_analysis.time_to_spillover)}m
                      </span>
                    </>
                  )}
                </p>
                {/* Queue risk bar */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      queue_analysis.blocking_probability >= 0.7
                        ? 'bg-red-500'
                        : queue_analysis.blocking_probability >= 0.4
                          ? 'bg-orange-400'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${queue_analysis.blocking_probability * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Severity label row */}
            <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-4 py-2.5">
              <AlertTriangle
                size={14}
                className={
                  prediction.severity_label === 'Critical'
                    ? 'text-red-400'
                    : prediction.severity_label === 'High'
                      ? 'text-orange-400'
                      : prediction.severity_label === 'Medium'
                        ? 'text-amber-400'
                        : 'text-emerald-500'
                }
              />
              <span className="text-[12px] text-muted-foreground">
                Severity classified as{' '}
                <span
                  className={`font-bold ${
                    prediction.severity_label === 'Critical'
                      ? 'text-red-400'
                      : prediction.severity_label === 'High'
                        ? 'text-orange-400'
                        : prediction.severity_label === 'Medium'
                          ? 'text-amber-400'
                          : 'text-emerald-500'
                  }`}
                >
                  {prediction.severity_label}
                </span>{' '}
                (score: {prediction.severity_score.toFixed(2)}) based on crowd density, corridor
                capacity, and historical precedents for this event type.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 4: SOP Checklist ──────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-0">
            <SectionHeader
              icon={FileBarChart}
              title="Standard Operating Procedure Checklist"
              subtitle="Verify these post-incident actions are completed before closing the event"
            />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Incident log filed with timestamp and location', done: true },
                { label: 'All deployed officers confirmed off-site', done: true },
                {
                  label: 'Traffic signal timings restored to baseline',
                  done: queue_analysis.risk_level === 'green',
                },
                {
                  label: 'Barricades removed and inventoried',
                  done: pipelineResult.barricade_plan?.barricades?.length === 0,
                },
                {
                  label: 'After-action report submitted to watch commander',
                  done: hasCounterfactual,
                },
                { label: 'Similar incident database updated', done: hasSimilar },
                { label: 'Fleet reassigned to standby positions', done: false },
                { label: 'Public advisory removed from traffic info boards', done: false },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[12px] ${
                    item.done
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {item.done ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  ) : (
                    <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-muted-foreground/40" />
                  )}
                  {item.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
