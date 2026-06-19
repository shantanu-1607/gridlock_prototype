interface Props {
  riskLevel: string
  blockingProbability: number
  queueLength: number
  spilloverTime: number
}

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  critical: '#dc2626',
}

const RISK_BADGE_CLASSES: Record<string, string> = {
  low: 'border-green/30 bg-green/15 text-green',
  yellow: 'border-yellow/30 bg-yellow/15 text-yellow',
  orange: 'border-orange/30 bg-orange/15 text-orange',
  red: 'border-red/30 bg-red/15 text-red',
  critical: 'border-critical/30 bg-critical/15 text-critical animate-pulse',
}

export default function RiskGauge({
  riskLevel,
  blockingProbability,
  queueLength,
  spilloverTime,
}: Props) {
  const color = RISK_COLORS[riskLevel] || '#6b7280'
  const angle = Math.min(blockingProbability, 1) * 180

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="w-[180px]">
        <svg viewBox="0 0 200 120" className="w-full">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${(angle / 180) * 251.3} 251.3`}
            className="transition-all duration-1000 ease-out"
          />
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 60 * Math.cos(Math.PI - (angle * Math.PI) / 180)}
            y2={100 - 60 * Math.sin(Math.PI - (angle * Math.PI) / 180)}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="6" fill={color} />
        </svg>
      </div>

      <div
        className={`rounded border px-4 py-1 font-mono text-xs font-bold tracking-[2px] ${
          RISK_BADGE_CLASSES[riskLevel] || 'border-text-dim/30 bg-text-dim/10 text-text-muted'
        }`}
      >
        {riskLevel.toUpperCase()} RISK
      </div>

      <div className="flex gap-6">
        <div className="flex flex-col items-center">
          <span className="font-mono text-lg font-bold text-text-primary">
            {Math.round(queueLength)}
          </span>
          <span className="text-[10px] tracking-wider text-text-muted uppercase">Queue Length</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-mono text-lg font-bold text-text-primary">
            {spilloverTime > 0 ? `${spilloverTime.toFixed(1)}m` : 'N/A'}
          </span>
          <span className="text-[10px] tracking-wider text-text-muted uppercase">Spillover</span>
        </div>
      </div>
    </div>
  )
}
