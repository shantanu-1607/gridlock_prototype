import { AlertTriangle, BarChart3, Clock, GitBranch, Shield, Users, Zap } from 'lucide-react'

import type { PipelineResult } from '../types'
import DeploymentTable from './DeploymentTable'
import RiskGauge from './RiskGauge'
import Timeline from './Timeline'

interface Props {
  result: PipelineResult
}

export default function PipelinePanel({ result }: Props) {
  const {
    prediction,
    queue_analysis,
    deployment_plan,
    gating_plan,
    anomaly_detection,
    prestaging_timeline,
  } = result

  return (
    <div className="pipeline-panel">
      {/* Top KPI Strip */}
      <div className="kpi-strip">
        <div className="kpi-card">
          <Clock size={20} className="kpi-icon" />
          <div>
            <span className="kpi-value">{Math.round(prediction.duration_mins)}</span>
            <span className="kpi-label">Predicted Minutes</span>
          </div>
        </div>
        <div className={`kpi-card severity-${prediction.severity_label.toLowerCase()}`}>
          <AlertTriangle size={20} className="kpi-icon" />
          <div>
            <span className="kpi-value">{prediction.severity_label}</span>
            <span className="kpi-label">
              Severity ({(prediction.severity_score * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <BarChart3 size={20} className="kpi-icon" />
          <div>
            <span className="kpi-value">{(prediction.confidence * 100).toFixed(0)}%</span>
            <span className="kpi-label">Confidence</span>
          </div>
        </div>
        <div className={`kpi-card anomaly-${anomaly_detection.anomaly_label}`}>
          <Zap size={20} className="kpi-icon" />
          <div>
            <span className="kpi-value">{anomaly_detection.anomaly_label.replace('_', ' ')}</span>
            <span className="kpi-label">
              Anomaly ({anomaly_detection.deviation_pct > 0 ? '+' : ''}
              {anomaly_detection.deviation_pct.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Risk Gauge + Deployment side by side */}
      <div className="pipeline-grid">
        <div className="panel-section">
          <h3>
            <Shield size={16} /> Congestion Risk
          </h3>
          <RiskGauge
            riskLevel={queue_analysis.risk_level}
            blockingProbability={queue_analysis.blocking_probability}
            queueLength={queue_analysis.expected_queue_length}
            spilloverTime={queue_analysis.time_to_spillover}
          />
        </div>

        <div className="panel-section">
          <h3>
            <Users size={16} /> Resource Deployment
          </h3>
          <DeploymentTable plan={deployment_plan} />
        </div>
      </div>

      {/* Gating Recommendations */}
      {gating_plan.recommendations.length > 0 && (
        <div className="panel-section">
          <h3>
            <GitBranch size={16} /> Signal Gating Recommendations
          </h3>
          <div className="gating-list">
            {gating_plan.recommendations.map((g, i) => (
              <div key={i} className="gating-item">
                <div className="gating-junction">{g.junction_name}</div>
                <div className="gating-change">
                  <span className="gating-from">{g.current_green_secs}s</span>
                  <span className="gating-arrow">&rarr;</span>
                  <span className="gating-to">{g.recommended_green_secs}s</span>
                </div>
                <div className="gating-reduction">-{g.reduction_pct.toFixed(0)}% green</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-staging Timeline */}
      <div className="panel-section">
        <h3>
          <Clock size={16} /> Pre-staging Timeline
        </h3>
        <Timeline steps={prestaging_timeline} />
      </div>
    </div>
  )
}
