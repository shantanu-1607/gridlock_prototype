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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

/**
 * Visualises the Graph BFS Propagation Engine output: how many junctions are
 * predicted to be congested as the incident's shockwave spreads over time.
 * Reads the pipeline's `propagation_forecast`, which holds a full simulation
 * state at T+5 / T+15 / T+30 min (each with an `activeNodes` map).
 */
interface Props {
  forecast: Record<string, unknown>
}

const CHECKPOINTS = [
  { key: 'T+5min', label: 'T+5' },
  { key: 'T+15min', label: 'T+15' },
  { key: 'T+30min', label: 'T+30' },
]

function affectedCount(state: unknown): number {
  if (!state || typeof state !== 'object') return 0
  const nodes = (state as { activeNodes?: Record<string, unknown> }).activeNodes
  return nodes && typeof nodes === 'object' ? Object.keys(nodes).length : 0
}

export default function PropagationForecastChart({ forecast }: Props) {
  const points = CHECKPOINTS.filter((c) => forecast && c.key in forecast).map((c) => ({
    label: c.label,
    count: affectedCount(forecast[c.key]),
  }))

  if (points.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No propagation forecast yet
      </div>
    )
  }

  // T+0 = the incident's own junction (the simulation starts from a single node).
  const labels = ['T+0', ...points.map((p) => p.label)]
  const data = [1, ...points.map((p) => p.count)]

  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: 'Congested junctions',
            data,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            pointBackgroundColor: '#ef4444',
            pointRadius: 4,
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
              label: (ctx) => `${ctx.parsed.y} junction${ctx.parsed.y === 1 ? '' : 's'} congested`,
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
