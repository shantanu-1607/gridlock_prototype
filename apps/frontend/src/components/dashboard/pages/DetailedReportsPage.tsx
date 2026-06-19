import { Clock, FileBarChart, Fingerprint, Target } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import Timeline from '../../analysis/Timeline'
import type { DashboardOutletContext } from '../AppLayout'

export default function DetailedReportsPage() {
  const { pipelineResult, selectedEvent } = useOutletContext<DashboardOutletContext>()
  const counterfactual = selectedEvent?.counterfactual

  if (!pipelineResult) {
    return (
      <div className="h-full overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Detailed Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historical precedents, pre-staging timeline, and post-event analysis
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
            <FileBarChart size={28} className="opacity-50" />
            <p className="text-sm font-medium">No event selected</p>
            <span className="text-xs">Plan a new event or select one from the control panel</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { similar_incidents, prestaging_timeline } = pipelineResult

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Detailed Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Historical precedents, pre-staging timeline, and post-event analysis
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {similar_incidents && similar_incidents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Fingerprint size={16} /> Historical Precedents
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock size={16} /> Pre-staging Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline steps={prestaging_timeline} />
          </CardContent>
        </Card>

        {counterfactual && counterfactual.prediction_accuracy_pct !== undefined && (
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target size={16} /> Post-Event Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center rounded-md border border-border bg-muted p-3">
                    <span className="font-mono text-lg font-bold text-primary">
                      {counterfactual.prediction_accuracy_pct.toFixed(0)}%
                    </span>
                    <span className="text-[10px] tracking-wider text-muted-foreground uppercase mt-0.5">
                      Accuracy
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-border bg-muted p-3">
                    <span className="font-mono text-lg font-bold text-primary">
                      {Math.round(counterfactual.actual_duration_mins)}m
                    </span>
                    <span className="text-[10px] tracking-wider text-muted-foreground uppercase mt-0.5">
                      Actual
                    </span>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-border bg-muted p-3">
                    <span className="font-mono text-lg font-bold text-primary">
                      {counterfactual.policy_regret.toFixed(1)}
                    </span>
                    <span className="text-[10px] tracking-wider text-muted-foreground uppercase mt-0.5">
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
                  <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-foreground">
                    {counterfactual.recommendation}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
