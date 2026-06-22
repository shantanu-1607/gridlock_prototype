import { Activity, Clock3 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import InfoHint from '@/components/ui/info-hint'

import type { PipelineResult, PlannedEvent } from '../../types'

/**
 * Surfaces the engineered spatio-temporal context behind a prediction so the model's
 * feature math is visible instead of hidden in the backend. The cyclical hour
 * encoding is computed exactly as the ML pipeline does it (features.py:
 * hour_sin = sin(2π·h/24), hour_cos = cos(2π·h/24)) — encoding time as a position on
 * a circle so 23:00 and 00:00 sit next to each other.
 */
interface Props {
  pipelineResult: PipelineResult
  event: PlannedEvent | null
}

const RUSH_HOURS = [8, 9, 10, 17, 18, 19]

export default function SpatioTemporalContextCard({ pipelineResult, event }: Props) {
  const dt = event?.start_datetime ? new Date(event.start_datetime) : null
  const valid = dt && !Number.isNaN(dt.getTime())
  const hour = valid ? dt!.getHours() : null
  const dow = valid ? dt!.getDay() : null

  const hourSin = hour !== null ? Math.sin((2 * Math.PI * hour) / 24) : 0
  const hourCos = hour !== null ? Math.cos((2 * Math.PI * hour) / 24) : 0
  const isRush = hour !== null && RUSH_HOURS.includes(hour)
  const isWeekend = dow !== null && (dow === 0 || dow === 6)
  const bucket =
    hour === null
      ? '—'
      : hour < 6
        ? 'Night'
        : hour < 12
          ? 'Morning'
          : hour < 17
            ? 'Afternoon'
            : 'Evening'

  // Clock geometry — dot at the event hour (12 o'clock = 0h, clockwise).
  const angle = hour !== null ? (2 * Math.PI * hour) / 24 - Math.PI / 2 : -Math.PI / 2
  const cx = 50 + 34 * Math.cos(angle)
  const cy = 50 + 34 * Math.sin(angle)

  const cf = pipelineResult.prediction.confidence_factors
  const interval = pipelineResult.prediction.prediction_interval
  const forecast = pipelineResult.prediction.duration_mins
  const baseline = pipelineResult.fingerprint_summary?.aggregated?.avg_duration_mins ?? null

  const chip = (active: boolean, label: string) => (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-muted text-muted-foreground'
      }`}
    >
      {label}
    </span>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity size={16} /> Spatio-Temporal Context
          <InfoHint
            title="Spatio-Temporal Context"
            what="The engineered time-and-place signals the model actually uses to make this prediction, shown in plain form."
            why="Lets you see why the model expects this duration — time-of-day, weekday, and how this event compares to its historical baseline — instead of trusting a black-box number."
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[auto_1fr]">
          {/* Cyclical hour clock */}
          <div className="flex flex-col items-center gap-2">
            <svg viewBox="0 0 100 100" className="h-28 w-28">
              <circle
                cx="50"
                cy="50"
                r="34"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="2"
              />
              {[0, 6, 12, 18].map((h) => {
                const a = (2 * Math.PI * h) / 24 - Math.PI / 2
                return (
                  <circle
                    key={h}
                    cx={50 + 34 * Math.cos(a)}
                    cy={50 + 34 * Math.sin(a)}
                    r="1.6"
                    fill="var(--color-muted-foreground)"
                  />
                )
              })}
              <line
                x1="50"
                y1="50"
                x2={cx}
                y2={cy}
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r="4" fill="var(--color-primary)" />
              <circle cx="50" cy="50" r="2.5" fill="var(--color-foreground)" />
            </svg>
            <span className="font-mono text-xs text-muted-foreground">
              {hour !== null ? `${String(hour).padStart(2, '0')}:00` : '—'} · cyclical
            </span>
          </div>

          {/* Engineered signals */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">hour_sin</span>
                <span className="text-foreground">{hourSin.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">hour_cos</span>
                <span className="text-foreground">{hourCos.toFixed(3)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {chip(isRush, 'Rush hour')}
              {chip(isWeekend, 'Weekend')}
              {chip(true, bucket)}
              {pipelineResult.queue_analysis?.risk_level
                ? chip(true, `${pipelineResult.queue_analysis.risk_level} risk`)
                : null}
            </div>

            {/* Forecast vs historical baseline */}
            {baseline !== null && (
              <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs">
                <div className="mb-1 flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock3 size={12} /> Forecast vs similar-incident baseline
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="font-bold text-foreground">{Math.round(forecast)}m</span>
                  <span className="text-muted-foreground">vs</span>
                  <span className="text-muted-foreground">{Math.round(baseline)}m avg</span>
                  <span
                    className={`ml-auto font-semibold ${
                      forecast > baseline ? 'text-orange' : 'text-green'
                    }`}
                  >
                    {forecast > baseline ? '+' : ''}
                    {baseline > 0 ? Math.round(((forecast - baseline) / baseline) * 100) : 0}%
                  </span>
                </div>
              </div>
            )}

            {/* Ensemble + interval */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
              {cf?.n_models ? (
                <span>
                  {cf.n_models}-model ensemble · σ{cf.ensemble_std.toFixed(2)}
                </span>
              ) : null}
              {typeof interval?.lower_mins === 'number' &&
              typeof interval?.upper_mins === 'number' ? (
                <span>
                  {Math.round(interval.lower_mins)}–{Math.round(interval.upper_mins)}m (
                  {Math.round((interval.coverage ?? 0.9) * 100)}% interval)
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
