import { AlertTriangle, BarChart3, Clock, Gauge, Shield, Waypoints, Zap } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import RiskGauge from '../../analysis/RiskGauge'
import RiskDistributionChart from '../../charts/RiskDistributionChart'
import SeverityTrendChart from '../../charts/SeverityTrendChart'
import type { DashboardOutletContext } from '../AppLayout'

const SEVERITY_COLOR: Record<string, string> = {
  low: 'text-green',
  medium: 'text-yellow',
  high: 'text-orange',
  critical: 'text-red',
}

const ANOMALY_COLOR: Record<string, string> = {
  normal: 'text-green',
  elevated: 'text-yellow',
  anomaly: 'text-orange',
  severe_anomaly: 'text-red',
}

const STAGE_TEXT: Record<string, string> = {
  green: 'text-green',
  yellow: 'text-yellow',
  red: 'text-orange',
  critical: 'text-red',
}

const STAGE_BORDER: Record<string, string> = {
  green: 'border-green/40',
  yellow: 'border-yellow/40',
  red: 'border-orange/50',
  critical: 'border-red/60',
}

export default function OverviewPage() {
  const { pipelineResult, events } = useOutletContext<DashboardOutletContext>()

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live snapshot of the most recently planned or selected event
        </p>
      </div>

      {pipelineResult ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3">
                <Clock size={20} className="shrink-0 text-primary" />
                <div>
                  <span className="block font-mono text-xl font-bold leading-tight">
                    {Math.round(pipelineResult.prediction.duration_mins)}
                  </span>
                  <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Predicted Minutes
                  </span>
                  {typeof pipelineResult.prediction.prediction_interval?.lower_mins === 'number' &&
                    typeof pipelineResult.prediction.prediction_interval?.upper_mins ===
                      'number' && (
                      <span className="block font-mono text-[10px] text-muted-foreground mt-0.5">
                        {Math.round(pipelineResult.prediction.prediction_interval.lower_mins)}–
                        {Math.round(pipelineResult.prediction.prediction_interval.upper_mins)} min
                        <span className="ml-1 opacity-70">
                          (
                          {Math.round(
                            (pipelineResult.prediction.prediction_interval.coverage ?? 0.9) * 100,
                          )}
                          % CI)
                        </span>
                      </span>
                    )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3">
                <AlertTriangle
                  size={20}
                  className={`shrink-0 ${SEVERITY_COLOR[pipelineResult.prediction.severity_label.toLowerCase()] || 'text-primary'}`}
                />
                <div>
                  <span
                    className={`block text-xl font-bold leading-tight ${SEVERITY_COLOR[pipelineResult.prediction.severity_label.toLowerCase()] || ''}`}
                  >
                    {pipelineResult.prediction.severity_label}
                  </span>
                  <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Severity
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3">
                <BarChart3 size={20} className="shrink-0 text-primary" />
                <div>
                  <span className="block font-mono text-xl font-bold leading-tight">
                    {typeof pipelineResult.prediction.confidence === 'number'
                      ? `${(pipelineResult.prediction.confidence * 100).toFixed(0)}%`
                      : '—'}
                  </span>
                  <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Confidence
                  </span>
                  {pipelineResult.prediction.confidence_factors?.n_models ? (
                    <span className="block font-mono text-[10px] text-muted-foreground mt-0.5">
                      {pipelineResult.prediction.confidence_factors.n_models}-model ensemble · σ
                      {pipelineResult.prediction.confidence_factors.ensemble_std.toFixed(2)}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3">
                <Zap
                  size={20}
                  className={`shrink-0 ${ANOMALY_COLOR[pipelineResult.anomaly_detection.anomaly_label] || 'text-primary'}`}
                />
                <div>
                  <span
                    className={`block text-xl font-bold capitalize leading-tight ${ANOMALY_COLOR[pipelineResult.anomaly_detection.anomaly_label] || ''}`}
                  >
                    {pipelineResult.anomaly_detection.anomaly_label.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Anomaly
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield size={16} /> Congestion Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskGauge
                  riskLevel={pipelineResult.queue_analysis.risk_level}
                  blockingProbability={pipelineResult.queue_analysis.blocking_probability}
                  queueLength={pipelineResult.queue_analysis.expected_queue_length}
                  spilloverTime={pipelineResult.queue_analysis.time_to_spillover}
                />
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Gauge size={16} /> Severity Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                <SeverityTrendChart events={events} />
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[220px]">
                <RiskDistributionChart events={events} />
              </CardContent>
            </Card>
          </div>

          {pipelineResult.queue_analysis.tandem?.is_tandem && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Waypoints size={16} /> Tandem Corridor Spillback
                  {pipelineResult.queue_analysis.tandem.corridor_gridlock && (
                    <span className="ml-1 rounded bg-red/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red">
                      Full-corridor gridlock
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-[11px] text-muted-foreground">
                  {pipelineResult.queue_analysis.tandem.n_segments} staged sub-segments · spillback{' '}
                  {pipelineResult.queue_analysis.tandem.spillback_rate_veh_per_min} veh/min ·{' '}
                  {pipelineResult.queue_analysis.tandem.total_queued_vehicles} vehicles queued
                </p>
                <div className="flex flex-wrap items-stretch gap-2">
                  {pipelineResult.queue_analysis.tandem.stages.map((s) => (
                    <div
                      key={s.stage}
                      className={`flex min-w-[120px] flex-1 flex-col gap-0.5 rounded-md border p-2.5 text-xs ${STAGE_BORDER[s.status] || 'border-border'}`}
                    >
                      <span className="font-semibold capitalize text-foreground">
                        {s.role === 'incident' ? 'Incident segment' : `Upstream stage ${s.stage}`}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${STAGE_TEXT[s.status] || 'text-muted-foreground'}`}
                      >
                        {s.status}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {s.time_to_gridlock_mins >= 0
                          ? `gridlock in ${s.time_to_gridlock_mins}m`
                          : 'stable'}
                        {' · '}
                        {Math.round(s.queue_vehicles)} veh
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {pipelineResult.anomaly_detection.context && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap size={16} /> Anomaly Detection
                  <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    Prophet ·{' '}
                    {pipelineResult.anomaly_detection.model_source.startsWith('corridor')
                      ? pipelineResult.anomaly_detection.model_source.replace('corridor:', '')
                      : 'global baseline'}
                  </span>
                  <span
                    className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${ANOMALY_COLOR[pipelineResult.anomaly_detection.anomaly_label] || 'text-muted-foreground'}`}
                  >
                    {pipelineResult.anomaly_detection.anomaly_label.replace('_', ' ')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="font-mono text-lg font-bold leading-tight">
                      {Math.round(pipelineResult.anomaly_detection.expected_duration_mins)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Expected min
                    </span>
                  </div>
                  <span className="text-muted-foreground">→</span>
                  <div className="flex flex-col">
                    <span className="font-mono text-lg font-bold leading-tight text-foreground">
                      {Math.round(pipelineResult.anomaly_detection.predicted_duration_mins)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Predicted min
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`font-mono text-lg font-bold leading-tight ${pipelineResult.anomaly_detection.deviation_pct > 0 ? 'text-orange' : 'text-green'}`}
                    >
                      {pipelineResult.anomaly_detection.deviation_pct > 0 ? '+' : ''}
                      {Math.round(pipelineResult.anomaly_detection.deviation_pct)}%
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Deviation
                    </span>
                  </div>
                  {pipelineResult.anomaly_detection.expected_range && (
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-semibold leading-tight text-muted-foreground">
                        {Math.round(pipelineResult.anomaly_detection.expected_range[0])}–
                        {Math.round(pipelineResult.anomaly_detection.expected_range[1])}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Normal range
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {pipelineResult.anomaly_detection.context}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <Gauge size={28} className="opacity-50" />
            <p className="text-sm font-medium">No event selected</p>
            <span className="text-xs">Plan a new event or select one from the control panel</span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
