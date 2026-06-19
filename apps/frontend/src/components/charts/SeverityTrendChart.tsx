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
  const recent = [...events]
    .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
    .slice(-12)

  const labels = recent.map((ev) =>
    new Date(ev.start_datetime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  )

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: 'Severity Score',
            data: recent.map((ev) => Math.round(ev.severity_score * 100)),
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
              label: (ctx) => `Severity: ${ctx.parsed.y}%`,
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
