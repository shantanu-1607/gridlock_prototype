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

import type { CounterfactualResult, PipelineResult } from '../../types'
import DeploymentTable from './DeploymentTable'
import RiskGauge from './RiskGauge'
import Timeline from './Timeline'

interface Props {
  result: PipelineResult
  counterfactual?: CounterfactualResult | null
}

const SEVERITY_KPI: Record<string, string> = {
  low: 'text-green',
  medium: 'text-yellow',
  high: 'text-orange',
  critical: 'text-red',
}

const ANOMALY_KPI: Record<string, string> = {
  normal: 'text-green',
  elevated: 'text-yellow',
  anomaly: 'text-orange',
  severe_anomaly: 'text-red',
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

  const severityKey = prediction.severity_label.toLowerCase()
  const anomalyKey = anomaly_detection.anomaly_label

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
          <Clock size={18} className="shrink-0 text-primary" />
          <div>
            <span className="block font-mono text-lg font-bold leading-tight">
              {Math.round(prediction.duration_mins)}
            </span>
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Predicted Minutes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
          <AlertTriangle
            size={18}
            className={`shrink-0 ${SEVERITY_KPI[severityKey] || 'text-primary'}`}
          />
          <div>
            <span
              className={`block font-mono text-lg font-bold leading-tight ${SEVERITY_KPI[severityKey] || ''}`}
            >
              {prediction.severity_label}
            </span>
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Severity ({(prediction.severity_score * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
          <BarChart3 size={18} className="shrink-0 text-primary" />
          <div>
            <span className="block font-mono text-lg font-bold leading-tight">
              {(prediction.confidence * 100).toFixed(0)}%
            </span>
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Confidence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3">
          <Zap size={18} className={`shrink-0 ${ANOMALY_KPI[anomalyKey] || 'text-primary'}`} />
          <div>
            <span
              className={`block font-mono text-lg font-bold capitalize leading-tight ${ANOMALY_KPI[anomalyKey] || ''}`}
            >
              {anomaly_detection.anomaly_label.replace('_', ' ')}
            </span>
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Anomaly ({anomaly_detection.deviation_pct > 0 ? '+' : ''}
              {anomaly_detection.deviation_pct.toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Risk Gauge */}
      <div className="rounded-lg border border-border bg-card p-3.5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
          <Shield size={14} /> Congestion Risk
        </h3>
        <RiskGauge
          riskLevel={queue_analysis.risk_level}
          blockingProbability={queue_analysis.blocking_probability}
          queueLength={queue_analysis.expected_queue_length}
          spilloverTime={queue_analysis.time_to_spillover}
        />
      </div>

      {/* Resource Deployment */}
      <div className="rounded-lg border border-border bg-card p-3.5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
          <Users size={14} /> Resource Deployment
        </h3>
        <DeploymentTable plan={deployment_plan} />
      </div>

      {/* Historical Precedents */}
      {similar_incidents && similar_incidents.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3.5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
            <Fingerprint size={14} /> Historical Precedents
          </h3>
          <div className="flex flex-col gap-2">
            {similar_incidents.map((evt, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md border border-border bg-muted p-2.5 text-xs transition-colors hover:border-primary/50"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold capitalize text-foreground">
                    {evt.event_cause.replace(/_/g, ' ')}
                  </span>
                  <span className="flex gap-2 text-[10px] text-muted-foreground">
                    <span>{evt.corridor}</span>
                    <span>{evt.hour}:00</span>
                    <span>{Math.round(evt.duration_mins)} min</span>
                  </span>
                </div>
                <span className="font-mono text-[13px] font-bold text-primary">
                  {(evt.similarity_score * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signal Gating */}
      {gating_plan.recommendations.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3.5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
            <GitBranch size={14} /> Signal Gating Recommendations
          </h3>
          <div className="flex flex-col gap-1.5">
            {gating_plan.recommendations.map((g, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-input p-2.5 text-xs"
              >
                <span className="flex-1 font-medium">{g.junction_name}</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-muted-foreground">{g.current_green_secs}s</span>
                  <span className="text-yellow">&rarr;</span>
                  <span className="font-semibold text-yellow">{g.recommended_green_secs}s</span>
                </div>
                <span className="min-w-[70px] text-right font-mono text-[11px] font-semibold text-red">
                  -{g.reduction_pct.toFixed(0)}% green
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pre-staging Timeline */}
      <div className="rounded-lg border border-border bg-card p-3.5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
          <Clock size={14} /> Pre-staging Timeline
        </h3>
        <Timeline steps={prestaging_timeline} />
      </div>

      {/* Counterfactual Analysis */}
      {counterfactual && counterfactual.prediction_accuracy_pct !== undefined && (
        <div className="mb-20 rounded-lg border border-border bg-card p-3.5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
            <Target size={14} /> Post-Event Analysis
          </h3>
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center rounded-md border border-border bg-muted p-2">
                <span className="font-mono text-base font-bold text-primary">
                  {counterfactual.prediction_accuracy_pct.toFixed(0)}%
                </span>
                <span className="text-[9px] tracking-wider text-muted-foreground uppercase mt-0.5">
                  Accuracy
                </span>
              </div>
              <div className="flex flex-col items-center rounded-md border border-border bg-muted p-2">
                <span className="font-mono text-base font-bold text-primary">
                  {Math.round(counterfactual.actual_duration_mins)}m
                </span>
                <span className="text-[9px] tracking-wider text-muted-foreground uppercase mt-0.5">
                  Actual
                </span>
              </div>
              <div className="flex flex-col items-center rounded-md border border-border bg-muted p-2">
                <span className="font-mono text-base font-bold text-primary">
                  {counterfactual.policy_regret.toFixed(1)}
                </span>
                <span className="text-[9px] tracking-wider text-muted-foreground uppercase mt-0.5">
                  Policy Regret
                </span>
              </div>
            </div>

            {counterfactual.scenarios.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {counterfactual.scenarios.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md border border-border bg-muted px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="font-medium text-foreground">
                      {s.scenario.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`font-mono font-semibold ${
                        s.improvement_pct > 0 ? 'text-green' : 'text-red'
                      }`}
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
              <div className="rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-[11px] leading-relaxed text-foreground">
                {counterfactual.recommendation}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
