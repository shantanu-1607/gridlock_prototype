import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

import type { PlannedEvent } from '../../types'

ChartJS.register(ArcElement, Tooltip)

// Must match the risk_level vocabulary the queue model emits (green/yellow/red/critical).
// Mismatched buckets silently drop events — e.g. every 'green' low-risk event was uncounted.
const RISK_LEVELS = ['green', 'yellow', 'red', 'critical'] as const
const RISK_COLORS: Record<string, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  critical: '#dc2626',
}
const RISK_LABELS: Record<string, string> = {
  green: 'Low',
  yellow: 'Elevated',
  red: 'Severe',
  critical: 'Critical',
}

interface Props {
  events: PlannedEvent[]
}

export default function RiskDistributionChart({ events }: Props) {
  const counts = RISK_LEVELS.map((level) => events.filter((ev) => ev.risk_level === level).length)
  const total = counts.reduce((a, b) => a + b, 0)

  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No risk data yet
      </div>
    )
  }

  return (
    <Doughnut
      data={{
        labels: RISK_LEVELS.map((l) => RISK_LABELS[l]),
        datasets: [
          {
            data: counts,
            backgroundColor: RISK_LEVELS.map((l) => RISK_COLORS[l]),
            borderWidth: 0,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#71717a', font: { size: 11 }, boxWidth: 10, padding: 12 },
          },
        },
      }}
    />
  )
}
