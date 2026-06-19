import type { TimelineStep } from '../../types'

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
    <div className="flex flex-col">
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
          <div key={i} className="flex min-h-[64px] gap-3">
            {/* Connector */}
            <div className="flex w-5 shrink-0 flex-col items-center">
              <div
                className={`z-[1] h-3 w-3 shrink-0 rounded-full ${isNow ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 12px ${color}60`,
                }}
              />
              {i < steps.length - 1 && <div className="my-0.5 w-0.5 flex-1 bg-border-default" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-3.5">
              <div className="mb-0.5 flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold" style={{ color }}>
                  {offsetLabel}
                </span>
                <span className="font-mono text-[11px] text-text-muted">{timeStr}</span>
              </div>
              <div className="text-[13px] font-semibold mb-0.5">{step.title}</div>
              <div className="text-[11px] leading-relaxed text-text-muted">{step.description}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
