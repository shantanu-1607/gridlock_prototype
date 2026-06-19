import { AlertTriangle, BarChart3, Clock, Gauge, Shield, Zap } from 'lucide-react'
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
                    {(pipelineResult.prediction.confidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
                    Confidence
                  </span>
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
