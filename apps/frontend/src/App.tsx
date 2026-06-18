import 'leaflet/dist/leaflet.css'
import './App.css'

import { useCallback, useEffect, useState } from 'react'

import EventList from './components/EventList'
import Header from './components/Header'
import MapView from './components/MapView'
import PipelinePanel from './components/PipelinePanel'
import PlanEventForm from './components/PlanEventForm'
import { useWebSocket } from './hooks/useWebSocket'
import type { PipelineResult, PlanEventPayload, PlannedEvent } from './types'
import { getEvents, planEvent } from './utils/api'

type View = 'form' | 'results'

function App() {
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

  // Load events on mount
  const fetchEvents = useCallback(async () => {
    try {
      const evts = await getEvents()
      setEvents(evts)
    } catch {
      // Backend may not be running
    }
  }, [])

  useEffect(() => {
    const load = () => {
      getEvents()
        .then(setEvents)
        .catch(() => {})
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

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
    } catch (err: any) {
      setError(err.message || 'Failed to plan event')
    } finally {
      setLoading(false)
    }
  }

  const handleEventSelect = (ev: PlannedEvent) => {
    setSelectedEvent(ev)
    setEventLat(ev.lat)
    setEventLon(ev.lon)
    // Reconstruct pipeline result from stored event data
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
    <div className="app">
      <Header wsConnected={connected} activeEvents={activeEvents.length} />

      <div className="main-layout">
        {/* Left Panel */}
        <aside className="left-panel">
          <div className="panel-tabs">
            <button className={`tab ${view === 'form' ? 'active' : ''}`} onClick={handleBackToForm}>
              Plan Event
            </button>
            <button
              className={`tab ${view === 'results' ? 'active' : ''}`}
              onClick={() => pipelineResult && setView('results')}
              disabled={!pipelineResult}
            >
              Analysis
            </button>
          </div>

          <div className="panel-content">
            {view === 'form' ? (
              <>
                <PlanEventForm onSubmit={handlePlanSubmit} loading={loading} />
                {error && <div className="error-banner">{error}</div>}
                <div className="events-section">
                  <h3 className="section-title">Recent Plans</h3>
                  <EventList
                    events={events.slice(0, 10)}
                    selectedId={selectedEvent?.id || null}
                    onSelect={handleEventSelect}
                  />
                </div>
              </>
            ) : pipelineResult ? (
              <PipelinePanel result={pipelineResult} />
            ) : null}
          </div>
        </aside>

        {/* Right Panel — Map */}
        <main className="right-panel">
          <MapView
            eventLat={eventLat}
            eventLon={eventLon}
            riskLevel={pipelineResult?.queue_analysis.risk_level}
            propagationTick={lastTick}
            pipeline={pipelineResult}
          />

          {/* Floating clock */}
          <div className="floating-clock">
            {clock.toLocaleTimeString('en-IN', { hour12: false })}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
