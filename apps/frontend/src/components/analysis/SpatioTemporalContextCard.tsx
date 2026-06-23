import { Clock3, History, MapPin, Target } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import InfoHint from '@/components/ui/info-hint'

import type { PipelineResult, PlannedEvent } from '../../types'

/**
 * Plain-language "why this prediction" context for non-technical operators.
 * Surfaces the real time/place signals the model uses — when it is, where it is,
 * and how it compares to similar past incidents — without any ML jargon.
 */
interface Props {
  pipelineResult: PipelineResult
  event: PlannedEvent | null
}

const BLR_LAT = 12.9716
const BLR_LON = 77.5946
const RUSH_HOURS = [8, 9, 10, 17, 18, 19]

function kmFromCentre(lat: number, lon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat - BLR_LAT)
  const dLon = toRad(lon - BLR_LON)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(BLR_LAT)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-[13px] leading-relaxed text-foreground">{children}</p>
      </div>
    </div>
  )
}

export default function SpatioTemporalContextCard({ pipelineResult, event }: Props) {
  const dt = event?.start_datetime ? new Date(event.start_datetime) : null
  const valid = dt && !Number.isNaN(dt.getTime())
  const hour = valid ? dt!.getHours() : null
  const dow = valid ? dt!.getDay() : null
  const isRush = hour !== null && RUSH_HOURS.includes(hour)
  const isWeekend = dow === 0 || dow === 6

  const timeLabel = valid
    ? dt!.toLocaleString('en-IN', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '—'

  // Plain-English read on the time of day.
  let timeInsight = 'Typical traffic conditions for this time.'
  if (hour !== null) {
    if (isRush) timeInsight = 'Rush hour — traffic clears more slowly than usual.'
    else if (hour < 6) timeInsight = 'Late night — lighter traffic, usually clears quicker.'
    else if (hour >= 22) timeInsight = 'Night — lighter traffic than daytime.'
    else timeInsight = 'Off-peak — moderate traffic for this time of day.'
  }
  if (isWeekend) timeInsight += ' Weekend pattern differs from weekdays.'

  // Clock hand angle (12-hour face, 12 o'clock at top).
  const angle = hour !== null ? ((hour % 12) / 12) * 2 * Math.PI - Math.PI / 2 : -Math.PI / 2
  const hx = 50 + 30 * Math.cos(angle)
  const hy = 50 + 30 * Math.sin(angle)
  const handColor = isRush ? 'var(--color-red)' : 'var(--color-primary)'

  const dist = event && typeof event.lat === 'number' ? kmFromCentre(event.lat, event.lon) : null
  const distLabel =
    dist === null ? null : dist < 10 ? `${dist.toFixed(1)} km` : `${Math.round(dist)} km`

  const forecast = Math.round(pipelineResult.prediction.duration_mins)
  const interval = pipelineResult.prediction.prediction_interval
  const agg = pipelineResult.fingerprint_summary?.aggregated ?? null
  const baseline = agg ? Math.round(agg.avg_duration_mins) : null
  const deltaPct =
    baseline && baseline > 0 ? Math.round(((forecast - baseline) / baseline) * 100) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock3 size={16} /> Incident Context
          <InfoHint
            title="Incident Context"
            what="The when and where behind this prediction, in plain terms — time of day, location, and how it compares to similar past incidents."
            why="Helps you sanity-check the forecast and plan resources without needing to read the model internals."
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[auto_1fr]">
          {/* Time-of-day clock */}
          <div className="flex flex-col items-center gap-2">
            <svg viewBox="0 0 100 100" className="h-24 w-24">
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="3"
              />
              {[0, 3, 6, 9].map((m) => {
                const a = (m / 12) * 2 * Math.PI - Math.PI / 2
                return (
                  <circle
                    key={m}
                    cx={50 + 38 * Math.cos(a)}
                    cy={50 + 38 * Math.sin(a)}
                    r="2"
                    fill="var(--color-muted-foreground)"
                  />
                )
              })}
              <line
                x1="50"
                y1="50"
                x2={hx}
                y2={hy}
                stroke={handColor}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx="50" cy="50" r="3.5" fill={handColor} />
            </svg>
            <span className="text-center text-xs font-semibold text-foreground">{timeLabel}</span>
          </div>

          {/* Plain context rows */}
          <div className="flex flex-col gap-3">
            <Row icon={<Clock3 size={14} />} label="Timing">
              {timeInsight}
            </Row>

            <Row icon={<MapPin size={14} />} label="Location">
              {distLabel
                ? `About ${distLabel} from the city centre — ${dist! < 6 ? 'central, denser road network' : 'outer area, more arterial roads'}.`
                : 'Location set for this incident.'}
            </Row>

            {baseline !== null ? (
              <Row icon={<History size={14} />} label="Compared to past incidents">
                Similar incidents on record averaged{' '}
                <span className="font-semibold text-foreground">{baseline} min</span>
                {agg
                  ? ` (${Math.round(agg.min_duration_mins)}–${Math.round(agg.max_duration_mins)} min across ${agg.count})`
                  : ''}
                .{' '}
                {deltaPct !== null && Math.abs(deltaPct) >= 5 ? (
                  <>
                    This one is forecast{' '}
                    <span
                      className={
                        deltaPct > 0 ? 'font-semibold text-orange' : 'font-semibold text-green'
                      }
                    >
                      {Math.abs(deltaPct)}% {deltaPct > 0 ? 'longer' : 'shorter'}
                    </span>{' '}
                    than usual.
                  </>
                ) : (
                  <>This forecast is in line with the usual.</>
                )}
              </Row>
            ) : (
              <Row icon={<History size={14} />} label="Compared to past incidents">
                No closely matching past incidents on record for this cause and location.
              </Row>
            )}

            <Row icon={<Target size={14} />} label="What to plan for">
              Expect about <span className="font-semibold text-foreground">{forecast} min</span> to
              clear.
              {typeof interval?.lower_mins === 'number' && typeof interval?.upper_mins === 'number'
                ? ` In most cases it falls between ${Math.round(interval.lower_mins)} and ${Math.round(interval.upper_mins)} min — keep contingency for the higher end.`
                : ''}
            </Row>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
