/* eslint-disable no-console */
import { useCallback, useEffect, useState } from 'react'

import { useWebSocket } from '../../hooks/useWebSocket'
import type { PipelineResult, PlanEventPayload, PlannedEvent } from '../../types'
import { getEvents, planEvent } from '../../utils/api'
import MapplsMap from '../map/MapplsMap'
import Header from './Header'
import Sidebar from './Sidebar'

type View = 'form' | 'results'

export default function DashboardLayout() {
  const [view, setView] = useState<View>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null)
  const [events, setEvents] = useState<PlannedEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<PlannedEvent | null>(null)
  const [eventLat, setEventLat] = useState<number | undefined>()
  const [eventLon, setEventLon] = useState<number | undefined>()
  const [clock, setClock] = useState(new Date())

  const { connected, lastTick } = useWebSocket()

  // Clock tick
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Load events on mount + poll
  const fetchEvents = useCallback(async () => {
    try {
      const evts = await getEvents()
      setEvents(evts)
    } catch {
      // Backend may not be running
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents()
    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  const handlePlanSubmit = async (payload: PlanEventPayload) => {
    setLoading(true)
    setError(null)
    try {
      const { pipeline } = await planEvent(payload)
      setPipelineResult(pipeline)
      setEventLat(payload.lat)
      setEventLon(payload.lon)
      setView('results')
      fetchEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to plan event')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseEvent = async (id: string) => {
    try {
      // Use closeEvent from api.ts (already imported? Let's verify, if not we will import)
      await import('../../utils/api').then((api) => api.closeEvent(id))
      fetchEvents()
    } catch (err) {
      console.error('Failed to close event', err)
    }
  }

  const handleEventSelect = (ev: PlannedEvent) => {
    setSelectedEvent(ev)
    setEventLat(ev.lat)
    setEventLon(ev.lon)
    if (ev.deployment_plan && ev.risk_level) {
      setPipelineResult({
        prediction: {
          duration_mins: ev.predicted_duration_mins,
          severity_score: ev.severity_score,
          severity_label:
            ev.severity_score > 0.85
              ? 'Critical'
              : ev.severity_score > 0.6
                ? 'High'
                : ev.severity_score > 0.3
                  ? 'Medium'
                  : 'Low',
          confidence: 0.7,
        },
        queue_analysis: {
          blocking_probability: ev.blocking_probability,
          expected_queue_length: ev.queue_length,
          expected_wait_time: 0,
          time_to_spillover: 0,
          risk_level: ev.risk_level,
          utilization: 0,
          effective_service_rate: 0,
          effective_arrival_rate: 0,
        },
        deployment_plan: ev.deployment_plan,
        gating_plan: ev.gating_plan || {
          risk_level: ev.risk_level,
          blocking_probability: ev.blocking_probability,
          recommendations: [],
        },
        similar_incidents: [],
        propagation_forecast: {},
        prestaging_timeline: ev.prestaging_timeline || [],
        anomaly_detection: {
          anomaly_score: ev.anomaly_score || 0,
          anomaly_label: ev.anomaly_label || 'unknown',
          expected_duration_mins: ev.predicted_duration_mins,
          predicted_duration_mins: ev.predicted_duration_mins,
          deviation_pct: 0,
          model_source: 'stored',
          context: '',
        },
      })
      setView('results')
    }
  }

  const handleBackToForm = () => {
    setView('form')
    setPipelineResult(null)
    setSelectedEvent(null)
  }

  const activeEvents = events.filter((e) => e.status === 'planned' || e.status === 'active')

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header wsConnected={connected} activeEvents={activeEvents.length} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left — Sidebar */}
        <Sidebar
          view={view}
          setView={setView}
          loading={loading}
          error={error}
          pipelineResult={pipelineResult}
          events={events}
          selectedEvent={selectedEvent}
          onPlanSubmit={handlePlanSubmit}
          onEventSelect={handleEventSelect}
          onBackToForm={handleBackToForm}
          onCloseEvent={handleCloseEvent}
        />

        {/* Right — Map (exclusively) */}
        <main className="relative flex-1 overflow-hidden">
          <MapplsMap
            eventLat={eventLat}
            eventLon={eventLon}
            riskLevel={pipelineResult?.queue_analysis.risk_level}
            propagationTick={lastTick}
            pipeline={pipelineResult}
          />

          <div className="absolute right-4 bottom-4 z-[1000] font-mono text-[28px] font-light tracking-wider text-muted-foreground opacity-60">
            {clock.toLocaleTimeString('en-IN', { hour12: false })}
          </div>
        </main>
      </div>
    </div>
  )
}
