import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

import type { PlannedEvent } from '../../types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

interface Props {
  events: PlannedEvent[]
}

export default function SeverityTrendChart({ events }: Props) {
  // A single incident's severity is fixed at the moment it occurs — it does not
  // evolve over days. So we don't connect raw per-event points (that would imply a
  // continuity that doesn't exist). Instead we aggregate by calendar day and plot
  // the *mean* severity of all incidents that day — a real operational trend showing
  // whether the city's incidents are getting more or less severe over time.
  const byDay = new Map<string, { sum: number; count: number; ts: number }>()
  for (const ev of events) {
    const d = new Date(ev.start_datetime)
    if (Number.isNaN(d.getTime())) continue
    const key = d.toISOString().slice(0, 10) // YYYY-MM-DD
    const dayStart = new Date(key).getTime()
    const bucket = byDay.get(key) ?? { sum: 0, count: 0, ts: dayStart }
    bucket.sum += (Number(ev.severity_score) || 0) * 100
    bucket.count += 1
    byDay.set(key, bucket)
  }

  const days = [...byDay.entries()].sort((a, b) => a[1].ts - b[1].ts).slice(-14) // last 14 days that had incidents

  const labels = days.map(([key]) =>
    new Date(key).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  )
  const avgSeverity = days.map(([, b]) => Math.round(b.sum / b.count))
  const counts = days.map(([, b]) => b.count)

  if (days.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No incident data yet
      </div>
    )
  }

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: 'Avg Severity',
            data: avgSeverity,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.12)',
            pointBackgroundColor: '#2563eb',
            pointRadius: 3,
            tension: 0.35,
            fill: true,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `${items[0].label}`,
              label: (ctx) => {
                const n = counts[ctx.dataIndex]
                return `Avg severity: ${ctx.parsed.y}%  ·  ${n} incident${n === 1 ? '' : 's'}`
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#71717a', font: { size: 11 } },
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(113, 113, 122, 0.12)' },
            ticks: { color: '#71717a', font: { size: 11 }, callback: (v) => `${v}%` },
          },
        },
      }}
    />
  )
}
