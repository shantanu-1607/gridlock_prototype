/* eslint-disable no-console, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { useWebSocket } from '../../hooks/useWebSocket'
import type { PipelineResult, PlanEventPayload, PlannedEvent } from '../../types'
import {
  closeEvent,
  getEventAssignments,
  getEventBarricades,
  getEvents,
  planEvent,
} from '../../utils/api'
import AppSidebar from './AppSidebar'
import { ChatAssistant } from './ChatAssistant'
import ControlPanel from './ControlPanel'
import Header from './Header'

export interface DashboardOutletContext {
  pipelineResult: PipelineResult | null
  selectedEvent: PlannedEvent | null
  eventLat: number | undefined
  eventLon: number | undefined
  events: PlannedEvent[]
  activeEvents: PlannedEvent[]
  wsConnected: boolean
  lastTick: ReturnType<typeof useWebSocket>['lastTick']
  onEventSelect: (ev: PlannedEvent | null) => void
  selectedEventAssignments: any[]
  selectedEventBarricades: any[]
  loadingDetails: boolean
}

export default function AppLayout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [events, setEvents] = useState<PlannedEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<PlannedEvent | null>(null)
  const [eventLat, setEventLat] = useState<number | undefined>()
  const [eventLon, setEventLon] = useState<number | undefined>()
  const [selectedEventAssignments, setSelectedEventAssignments] = useState<any[]>([])
  const [selectedEventBarricades, setSelectedEventBarricades] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  const { connected, lastTick } = useWebSocket()

  const handleEventSelect = (ev: PlannedEvent | null) => {
    if (!ev) {
      setSelectedEvent(null)
      setEventLat(undefined)
      setEventLon(undefined)
      setPipelineResult(null)
      setSelectedEventAssignments([])
      setSelectedEventBarricades([])
      return
    }
    setSelectedEvent(ev)
    setEventLat(ev.lat)
    setEventLon(ev.lon)
    setSelectedEventAssignments([])
    setSelectedEventBarricades([])

    const fleetPlanObj = ev.fleet_plan ||
      (ev as any).deployment_plan || {
        total_fleet_required: ev.total_fleet_required || 0,
        rationale: ev.recommendation_rationale || '',
        deployments: [],
        source: 'fallback',
      }
    const riskLevelVal = ev.risk_level || 'green'
    const gatingPlanObj = ev.gating_plan || {
      risk_level: riskLevelVal,
      blocking_probability: ev.blocking_probability || 0,
      recommendations: [],
    }

    setPipelineResult({
      prediction: {
        duration_mins: Number(ev.predicted_duration_mins || (ev as any).duration_mins) || 0,
        severity_score: Number(ev.severity_score) || 0,
        severity_label:
          Number(ev.severity_score) > 0.85
            ? 'Critical'
            : Number(ev.severity_score) > 0.6
              ? 'High'
              : Number(ev.severity_score) > 0.3
                ? 'Medium'
                : 'Low',
        confidence: 0.7,
        prediction_interval: null,
        confidence_factors: null,
      },
      queue_analysis: {
        blocking_probability: Number(ev.blocking_probability) || 0,
        expected_queue_length: Number(ev.queue_length) || 0,
        expected_wait_time: 0,
        time_to_spillover: Number((ev as any).time_to_spillover) || 0,
        risk_level: riskLevelVal,
        utilization: 0,
        effective_service_rate: 0,
        effective_arrival_rate: 0,
      },
      fleet_plan: fleetPlanObj,
      barricade_plan: ev.barricade_plan || {
        barricades: [],
        rationale: ev.barricade_rationale || '',
        source: 'fallback',
      },
      gating_plan: gatingPlanObj,
      similar_incidents: (ev as any).similar_incidents || [],
      fingerprint_summary: (ev as any).fingerprint_summary || undefined,
      propagation_forecast: (ev as any).propagation_forecast || {},
      prestaging_timeline: ev.prestaging_timeline || [],
      anomaly_detection: {
        anomaly_score: Number(ev.anomaly_score) || 0,
        anomaly_label: ev.anomaly_label || 'unknown',
        expected_duration_mins:
          Number(ev.predicted_duration_mins || (ev as any).duration_mins) || 0,
        predicted_duration_mins:
          Number(ev.predicted_duration_mins || (ev as any).duration_mins) || 0,
        deviation_pct: 0,
        model_source: 'stored',
        context: '',
      },
    })
  }

  const fetchSelectedEventDetails = useCallback(async (eventId: string) => {
    try {
      const [assignments, barricades] = await Promise.all([
        getEventAssignments(eventId),
        getEventBarricades(eventId),
      ])
      setSelectedEventAssignments(assignments)
      setSelectedEventBarricades(barricades)

      // Sync the fetched barricades back to pipelineResult if it exists
      setPipelineResult((prev) => {
        if (!prev) return null
        return {
          ...prev,
          barricade_plan: {
            ...prev.barricade_plan,
            barricades: barricades,
          },
        }
      })
    } catch (err) {
      console.error('Failed to fetch details for event', eventId, err)
    }
  }, [])

  useEffect(() => {
    if (!selectedEvent) return

    setLoadingDetails(true)
    fetchSelectedEventDetails(selectedEvent.id).finally(() => {
      setLoadingDetails(false)
    })
  }, [selectedEvent?.id, fetchSelectedEventDetails])

  useEffect(() => {
    if (!selectedEvent) return

    const interval = setInterval(() => {
      fetchSelectedEventDetails(selectedEvent.id)
    }, 10000)

    return () => clearInterval(interval)
  }, [selectedEvent?.id, fetchSelectedEventDetails])

  const fetchEvents = useCallback(async () => {
    try {
      const evts = await getEvents()
      setEvents(evts)
    } catch {
      // Backend may not be running
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  // Sync selected event changes from background polling
  useEffect(() => {
    if (!selectedEvent) return
    const updated = events.find((e) => e.id === selectedEvent.id)
    if (updated) {
      const hasChanged =
        updated.status !== selectedEvent.status ||
        updated.severity_score !== selectedEvent.severity_score ||
        updated.risk_level !== selectedEvent.risk_level ||
        updated.queue_length !== selectedEvent.queue_length

      if (hasChanged) {
        handleEventSelect(updated)
      }
    }
  }, [events, selectedEvent?.id])

  const handlePlanSubmit = async (payload: PlanEventPayload): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const { pipeline, event } = await planEvent(payload)
      setPipelineResult(pipeline)
      setEventLat(payload.lat)
      setEventLon(payload.lon)
      setSelectedEvent(event)
      fetchEvents()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to plan event')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleCloseEvent = useCallback(
    async (id: string) => {
      try {
        await closeEvent(id)
        fetchEvents()
        setSelectedEvent((prev) => (prev?.id === id ? { ...prev, status: 'closed' } : prev))
      } catch (err) {
        console.error('Failed to close event', err)
      }
    },
    [fetchEvents],
  )

  const activeEvents = events.filter(
    (e) => e.status === 'planned' || e.status === 'active' || e.status === 'resolved',
  )

  useEffect(() => {
    if (lastTick && Object.keys(lastTick.activeNodes).length === 0) {
      const activeEvent = events.find(
        (e) => e.id === lastTick.eventId && (e.status === 'active' || e.status === 'planned'),
      )
      if (activeEvent) {
        handleCloseEvent(lastTick.eventId)
      }
    }
  }, [lastTick, events, handleCloseEvent])

  const outletContext: DashboardOutletContext = {
    pipelineResult,
    selectedEvent,
    eventLat,
    eventLon,
    events,
    activeEvents,
    wsConnected: connected,
    lastTick,
    onEventSelect: handleEventSelect,
    selectedEventAssignments,
    selectedEventBarricades,
    loadingDetails,
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header wsConnected={connected} activeEvents={activeEvents.length} />

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar chatOpen={chatOpen} onChatToggle={() => setChatOpen((prev) => !prev)} />

        <main className="relative flex-1 overflow-hidden">
          <Outlet context={outletContext} />
          <ChatAssistant isOpen={chatOpen} setIsOpen={setChatOpen} />
        </main>

        <ControlPanel
          loading={loading}
          error={error}
          events={events}
          selectedEvent={selectedEvent}
          onPlanSubmit={handlePlanSubmit}
          onEventSelect={handleEventSelect}
          onCloseEvent={handleCloseEvent}
        />
      </div>
    </div>
  )
}
