import {
  AlertTriangle,
  BarChart3,
  Clock,
  Fingerprint,
  GitBranch,
  Shield,
  Target,
  Users,
  Zap,
} from 'lucide-react'

import type { CounterfactualResult, PipelineResult } from '../types'
import DeploymentTable from './DeploymentTable'
import RiskGauge from './RiskGauge'
import Timeline from './Timeline'

interface Props {
  result: PipelineResult
  counterfactual?: CounterfactualResult | null
}

export default function PipelinePanel({ result, counterfactual }: Props) {
  const {
    prediction,
    queue_analysis,
    deployment_plan,
    gating_plan,
    anomaly_detection,
    prestaging_timeline,
    similar_incidents,
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

      {/* Event Fingerprinting — Historical Precedents */}
      {similar_incidents && similar_incidents.length > 0 && (
        <div className="panel-section">
          <h3>
            <Fingerprint size={16} /> Historical Precedents
          </h3>
          <div className="fingerprint-card">
            {similar_incidents.map((evt, i) => (
              <div key={i} className="fingerprint-item">
                <div className="fingerprint-left">
                  <span className="fingerprint-cause">{evt.event_cause.replace(/_/g, ' ')}</span>
                  <span className="fingerprint-meta">
                    <span>{evt.corridor}</span>
                    <span>{evt.hour}:00</span>
                    <span>{Math.round(evt.duration_mins)} min</span>
                  </span>
                </div>
                <span className="fingerprint-score">
                  {(evt.similarity_score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* Post-Event Accuracy / Counterfactual Analysis */}
      {counterfactual && counterfactual.prediction_accuracy_pct !== undefined && (
        <div className="panel-section">
          <h3>
            <Target size={16} /> Post-Event Analysis
          </h3>
          <div className="counterfactual-card">
            <div className="cf-summary">
              <div className="cf-stat">
                <span className="cf-stat-value">
                  {counterfactual.prediction_accuracy_pct.toFixed(0)}%
                </span>
                <span className="cf-stat-label">Accuracy</span>
              </div>
              <div className="cf-stat">
                <span className="cf-stat-value">
                  {Math.round(counterfactual.actual_duration_mins)}m
                </span>
                <span className="cf-stat-label">Actual</span>
              </div>
              <div className="cf-stat">
                <span className="cf-stat-value">{counterfactual.policy_regret.toFixed(1)}</span>
                <span className="cf-stat-label">Policy Regret</span>
              </div>
            </div>

            {counterfactual.scenarios.length > 0 && (
              <div className="cf-scenarios">
                {counterfactual.scenarios.map((s, i) => (
                  <div key={i} className="cf-scenario">
                    <span className="cf-scenario-name">{s.scenario.replace(/_/g, ' ')}</span>
                    <span
                      className={`cf-scenario-improvement ${s.improvement_pct > 0 ? 'positive' : 'negative'}`}
                    >
                      {s.improvement_pct > 0 ? '-' : '+'}
                      {Math.abs(s.improvement_mins).toFixed(0)}m (
                      {Math.abs(s.improvement_pct).toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            )}

            {counterfactual.recommendation && (
              <div className="cf-recommendation">{counterfactual.recommendation}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
