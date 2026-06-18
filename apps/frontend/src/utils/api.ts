import type { PipelineResult, PlanEventPayload, PlannedEvent } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function planEvent(payload: PlanEventPayload): Promise<{
  event: PlannedEvent
  pipeline: PipelineResult
}> {
  const res = await fetch(`${API_BASE}/api/events/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Plan failed: ${res.statusText}`)
  const data = await res.json()
  return { event: data.event, pipeline: data.pipeline }
}

export async function getEvents(status?: string): Promise<PlannedEvent[]> {
  const url = status ? `${API_BASE}/api/events?status=${status}` : `${API_BASE}/api/events`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch events failed: ${res.statusText}`)
  const data = await res.json()
  return data.events
}

export async function closeEvent(id: string): Promise<{ message: string; event: PlannedEvent }> {
  const res = await fetch(`${API_BASE}/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'closed',
      closed_datetime: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(`Close failed: ${res.statusText}`)
  return res.json()
}

export function createWebSocket(): WebSocket {
  const wsUrl = API_BASE.replace(/^http/, 'ws')
  return new WebSocket(wsUrl)
}
