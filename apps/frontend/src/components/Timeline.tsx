import type { TimelineStep } from '../types'

const ACTION_COLORS: Record<string, string> = {
  ALERT_BRIEFING: '#f59e0b',
  DEPLOY_BARRICADES: '#f97316',
  DEPLOY_OFFICERS: '#3b82f6',
  FINAL_CHECK: '#8b5cf6',
  EVENT_START: '#ef4444',
  EXPECTED_CLEARANCE: '#10b981',
}

interface Props {
  steps: TimelineStep[]
}

export default function Timeline({ steps }: Props) {
  return (
    <div className="timeline">
      {steps.map((step, i) => {
        const color = ACTION_COLORS[step.action] || '#64748b'
        const isNow = step.offset_mins === 0
        const time = new Date(step.time)
        const timeStr = time.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        const offsetLabel =
          step.offset_mins < 0
            ? `T${step.offset_mins}m`
            : step.offset_mins === 0
              ? 'T-0'
              : `T+${step.offset_mins}m`

        return (
          <div key={i} className={`timeline-item ${isNow ? 'timeline-now' : ''}`}>
            <div className="timeline-connector">
              <div
                className="timeline-dot"
                style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}60` }}
              />
              {i < steps.length - 1 && <div className="timeline-line" />}
            </div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-offset" style={{ color }}>
                  {offsetLabel}
                </span>
                <span className="timeline-time">{timeStr}</span>
              </div>
              <div className="timeline-title">{step.title}</div>
              <div className="timeline-desc">{step.description}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
