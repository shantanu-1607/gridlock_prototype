import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'react-chartjs-2'

import type { SimilarEvent } from '../../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

/**
 * Severity distribution of the current incident's historical analogues (the
 * fingerprint matches). Buckets the matched real incidents by severity band so
 * the operator can see how serious similar past incidents turned out — evidence
 * that the current forecast is grounded in real precedent. Bands mirror the ML
 * SEVERITY_THRESHOLDS.
 */
interface Props {
  matches: SimilarEvent[]
}

const BANDS = [
  { label: 'Low', color: '#10b981', test: (s: number) => s < 0.3 },
  { label: 'Medium', color: '#f59e0b', test: (s: number) => s >= 0.3 && s < 0.6 },
  { label: 'High', color: '#f97316', test: (s: number) => s >= 0.6 && s < 0.85 },
  { label: 'Critical', color: '#ef4444', test: (s: number) => s >= 0.85 },
]

export default function SimilarIncidentSeverityChart({ matches }: Props) {
  if (!matches || matches.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No similar incidents found
      </div>
    )
  }

  const counts = BANDS.map(
    (b) => matches.filter((m) => b.test(Number(m.severity_score) || 0)).length,
  )

  return (
    <Bar
      data={{
        labels: BANDS.map((b) => b.label),
        datasets: [
          {
            data: counts,
            backgroundColor: BANDS.map((b) => b.color),
            borderRadius: 4,
            borderWidth: 0,
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
              label: (ctx) => `${ctx.parsed.y} incident${ctx.parsed.y === 1 ? '' : 's'}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#71717a', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(113, 113, 122, 0.12)' },
            ticks: { color: '#71717a', font: { size: 11 }, precision: 0 },
          },
        },
      }}
    />
  )
}
