import { motion, type Variants } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  FileBarChart,
  Fingerprint,
  Info,
  MapPin,
  Navigation,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import Timeline from '../../analysis/Timeline'
import type { DashboardOutletContext } from '../AppLayout'

/** Severity-score → swatch colour (matches the global --color-* tokens). */
function severityColor(score: number): string {
  if (score > 0.85) return 'var(--color-red)'
  if (score > 0.6) return 'var(--color-orange)'
  if (score > 0.3) return 'var(--color-yellow)'
  return 'var(--color-green)'
}

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] },
  },
}

export default function DetailedReportsPage() {
  const { pipelineResult, selectedEvent } = useOutletContext<DashboardOutletContext>()
  const [showAllMatches, setShowAllMatches] = useState(false)
  const counterfactual = selectedEvent?.counterfactual

  if (!pipelineResult) {
    return (
      <div className="h-full overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Detailed Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Event fingerprint, pre-staging timeline, and post-event analysis
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <FileBarChart size={28} className="opacity-50" />
            <p className="text-sm font-medium">No event selected</p>
            <span className="text-xs">Plan a new event or select one from the control panel</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { similar_incidents, prestaging_timeline, fingerprint_summary, diversion_plan } =
    pipelineResult
  const diversionRoutes = diversion_plan?.routes ?? []
  const matches = similar_incidents ?? []
  const agg = fingerprint_summary?.aggregated ?? null
  const meta = fingerprint_summary?.meta ?? null

  const forecast = pipelineResult.prediction.duration_mins
  const interval = pipelineResult.prediction.prediction_interval

  // Forecast-vs-precedent verdict — the credibility punchline.
  const verdict = agg
    ? forecast > agg.max_duration_mins
      ? {
          label: 'Longer than any precedent — flag for review',
          cls: 'text-orange border-orange/30 bg-orange/5',
          Icon: AlertTriangle,
        }
      : forecast < agg.min_duration_mins
        ? {
            label: 'Shorter than all precedents',
            cls: 'text-primary border-primary/30 bg-primary/5',
            Icon: Zap,
          }
        : {
            label: 'Consistent with historical precedent',
            cls: 'text-green border-green/30 bg-green/5',
            Icon: CheckCircle,
          }
    : null

  // Range strip domain — always wide enough to show the forecast marker.
  const lo = agg ? Math.min(agg.min_duration_mins, forecast) : 0
  const hi = agg ? Math.max(agg.max_duration_mins, forecast) : 1
  const span = hi - lo || 1
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100))

  // Honest degraded-state notes.
  const eventCause = selectedEvent?.category?.trim().toLowerCase()
  const causeRemapped = !!(meta?.cause_matched && eventCause && meta.cause_matched !== eventCause)

  const visibleMatches = showAllMatches ? matches : matches.slice(0, 3)

  return (
    <div className="h-full overflow-y-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-extrabold tracking-tight">Detailed Reports</h1>
        <p className="text-base text-muted-foreground mt-1">
          Event fingerprint, pre-staging timeline, and post-event analysis
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4"
      >
        {/* ── Event Fingerprint (hero) ─────────────────────────────── */}
        <motion.div variants={cardVariants} className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint size={18} /> Event Fingerprint
              </CardTitle>
              {meta && meta.corpus_size > 0 && (
                <p className="text-sm text-muted-foreground">
                  Pattern-matched against{' '}
                  <span className="font-semibold text-foreground">
                    {meta.corpus_size.toLocaleString()}
                  </span>{' '}
                  real incidents · {matches.length} closest shown
                  {meta.n_candidates > 0 && (
                    <span className="text-xs">
                      {' '}
                      · {meta.n_candidates} same-cause candidates near this time
                    </span>
                  )}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {matches.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-8 text-center text-muted-foreground">
                  <Fingerprint size={26} className="opacity-40" />
                  <p className="text-sm font-medium">No close historical analogues found</p>
                  <span className="text-xs">
                    No prior incidents matched this cause and location in the corpus.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {/* Forecast anchor */}
                  {agg && (
                    <div className="rounded-md border border-border bg-muted/50 p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">
                            Model forecast
                          </span>
                          <span className="font-mono text-lg font-bold text-foreground">
                            {Math.round(forecast)} min
                          </span>
                          {interval?.lower_mins !== null &&
                            interval?.lower_mins !== undefined &&
                            interval?.upper_mins !== null &&
                            interval?.upper_mins !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {Math.round(interval.lower_mins)}–{Math.round(interval.upper_mins)}{' '}
                                min
                                {interval.coverage
                                  ? ` (${Math.round(interval.coverage * 100)}% interval)`
                                  : ''}
                              </span>
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">
                            Historical analogues
                          </span>
                          <span className="font-mono text-lg font-bold text-foreground">
                            {Math.round(agg.avg_duration_mins)} min avg
                          </span>
                          <span className="text-xs text-muted-foreground">
                            range {Math.round(agg.min_duration_mins)}–
                            {Math.round(agg.max_duration_mins)} min · {agg.count} matches
                          </span>
                        </div>
                      </div>

                      {verdict && (
                        <div
                          className={`mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${verdict.cls}`}
                        >
                          <verdict.Icon size={16} className="shrink-0" />
                          {verdict.label}
                        </div>
                      )}

                      {/* Min–avg–max range strip */}
                      <div className="relative mt-4 mb-1 h-9">
                        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
                        {/* historical band */}
                        <div
                          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/40"
                          style={{
                            left: `${pct(agg.min_duration_mins)}%`,
                            width: `${pct(agg.max_duration_mins) - pct(agg.min_duration_mins)}%`,
                          }}
                        />
                        {/* avg marker */}
                        <div
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${pct(agg.avg_duration_mins)}%` }}
                        >
                          <div className="h-3 w-3 rounded-full bg-primary" />
                          <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[11px] text-muted-foreground">
                            avg
                          </span>
                        </div>
                        {/* forecast marker */}
                        <div
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${pct(forecast)}%` }}
                        >
                          <div className="h-5 w-0.5 bg-foreground" />
                          <span className="absolute left-1/2 -top-5 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-foreground">
                            forecast
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Degraded-state honesty notes */}
                  {(causeRemapped || meta?.hour_window_relaxed) && (
                    <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      {causeRemapped && (
                        <span className="flex items-center gap-1.5">
                          <Info size={14} className="shrink-0" />
                          No exact “{eventCause}” precedent in the corpus — showing closest
                          analogues (matched as “{meta?.cause_matched}”).
                        </span>
                      )}
                      {meta?.hour_window_relaxed && (
                        <span className="flex items-center gap-1.5">
                          <Info size={14} className="shrink-0" />
                          Time-of-day window widened to find enough analogues.
                        </span>
                      )}
                    </div>
                  )}

                  {/* Precedent matches */}
                  <div className="flex flex-col gap-2">
                    {visibleMatches.map((evt, i) => (
                      <div
                        key={evt.event_id || i}
                        className="flex items-center justify-between rounded-md border border-border bg-muted p-3 text-sm transition-colors hover:border-primary/50"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: severityColor(evt.severity_score) }}
                            title={`severity ${evt.severity_score.toFixed(2)}`}
                          />
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold capitalize text-foreground">
                              {evt.event_cause.replace(/_/g, ' ')}
                            </span>
                            <span className="flex gap-2 text-xs text-muted-foreground">
                              <span>{evt.corridor}</span>
                              <span>{evt.hour}:00</span>
                              <span>{Math.round(evt.duration_mins)} min</span>
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-base font-bold text-primary">
                          {(evt.similarity_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}

                    {matches.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllMatches((v) => !v)}
                        className="self-center text-sm font-medium text-primary hover:underline"
                      >
                        {showAllMatches ? 'Show fewer' : `+${matches.length - 3} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Pre-staging Timeline ─────────────────────────────────── */}
        <motion.div variants={cardVariants} className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock size={18} /> Pre-staging Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline steps={prestaging_timeline} />
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Diversion Routes ─────────────────────────────────────── */}
        {diversionRoutes.length > 0 && (
          <motion.div variants={cardVariants} className="col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Navigation size={18} /> Diversion Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2.5">
                  {diversionRoutes.map((route, i) => (
                    <div
                      key={`${route.at_risk_corridor}-${route.via_corridor}-${i}`}
                      className="rounded-md border border-green/30 bg-green/5 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-base font-semibold">
                        <span className="text-red">{route.at_risk_corridor}</span>
                        <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                        <span className="text-green">via {route.via_corridor}</span>
                        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {route.rejoins ? 'Divert + rejoin' : 'Divert'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin size={14} className="shrink-0" />
                        Divert at {route.from.name}
                        {route.rejoins
                          ? ` • rejoin ${route.at_risk_corridor} at ${route.to.name}`
                          : ` • hand off to ${route.to.name}`}
                      </div>
                      {route.reason && (
                        <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                          {route.reason}
                        </p>
                      )}
                    </div>
                  ))}

                  {diversion_plan?.rationale && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground">
                      {diversion_plan.rationale}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── Post-Event Analysis ──────────────────────────────────── */}
        {counterfactual && counterfactual.prediction_accuracy_pct !== undefined && (
          <motion.div variants={cardVariants} className="col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target size={18} /> Post-Event Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center rounded-md border border-border bg-muted p-4">
                      <span className="font-mono text-2xl font-bold text-primary">
                        {counterfactual.prediction_accuracy_pct.toFixed(0)}%
                      </span>
                      <span className="text-xs tracking-wider text-muted-foreground uppercase mt-1">
                        Accuracy
                      </span>
                    </div>
                    <div className="flex flex-col items-center rounded-md border border-border bg-muted p-4">
                      <span className="font-mono text-2xl font-bold text-primary">
                        {Math.round(counterfactual.actual_duration_mins)}m
                      </span>
                      <span className="text-xs tracking-wider text-muted-foreground uppercase mt-1">
                        Actual
                      </span>
                    </div>
                    <div className="flex flex-col items-center rounded-md border border-border bg-muted p-4">
                      <span className="font-mono text-2xl font-bold text-primary">
                        {counterfactual.policy_regret.toFixed(1)}
                      </span>
                      <span className="text-xs tracking-wider text-muted-foreground uppercase mt-1">
                        Policy Regret
                      </span>
                    </div>
                  </div>

                  {counterfactual.scenarios.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {counterfactual.scenarios.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm"
                        >
                          <span className="flex items-center gap-2 font-medium text-foreground">
                            {s.improvement_pct > 0 ? (
                              <TrendingDown size={14} className="text-green shrink-0" />
                            ) : (
                              <TrendingUp size={14} className="text-red shrink-0" />
                            )}
                            {s.scenario.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`font-mono font-semibold ${
                              s.improvement_pct > 0 ? 'text-green' : 'text-red'
                            }`}
                          >
                            {s.improvement_pct > 0 ? '-' : '+'}
                            {Math.abs(s.improvement_mins).toFixed(0)}m (
                            {Math.abs(s.improvement_pct).toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {counterfactual.recommendation && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground">
                      {counterfactual.recommendation}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
