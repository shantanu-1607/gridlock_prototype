import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'react-chartjs-2'

import type { DeploymentItem } from '../../types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface Props {
  items: DeploymentItem[]
}

export default function DeploymentBarChart({ items }: Props) {
  return (
    <Bar
      data={{
        labels: items.map((i) => i.junction_name || i.junction_id),
        datasets: [
          {
            label: 'Officers',
            data: items.map((i) => i.officers),
            backgroundColor: '#2563eb',
            borderRadius: 4,
          },
          {
            label: 'Barricades',
            data: items.map((i) => i.barricades),
            backgroundColor: '#f97316',
            borderRadius: 4,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#71717a', font: { size: 11 }, boxWidth: 10, padding: 12 },
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
            ticks: { color: '#71717a', font: { size: 11 } },
          },
        },
      }}
    />
  )
}
