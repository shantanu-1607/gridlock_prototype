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

export default function RiskGauge({
  riskLevel,
  blockingProbability,
  queueLength,
  spilloverTime,
}: Props) {
  const color = RISK_COLORS[riskLevel] || '#6b7280'
  const angle = Math.min(blockingProbability, 1) * 180

  return (
    <div className="risk-gauge-card">
      <div className="gauge-container">
        <svg viewBox="0 0 200 120" className="gauge-svg">
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
            className="gauge-fill"
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
          <text x="100" y="88" textAnchor="middle" fill={color} fontSize="22" fontWeight="bold">
            {Math.round(blockingProbability * 100)}%
          </text>
          <text x="100" y="75" textAnchor="middle" fill="#94a3b8" fontSize="9">
            BLOCKING PROB
          </text>
        </svg>
      </div>

      <div className={`risk-badge risk-${riskLevel}`}>{riskLevel.toUpperCase()} RISK</div>

      <div className="gauge-stats">
        <div className="gauge-stat">
          <span className="stat-value">{Math.round(queueLength)}</span>
          <span className="stat-label">Queue Length</span>
        </div>
        <div className="gauge-stat">
          <span className="stat-value">
            {spilloverTime > 0 ? `${spilloverTime.toFixed(1)}m` : 'N/A'}
          </span>
          <span className="stat-label">Spillover</span>
        </div>
      </div>
    </div>
  )
}
