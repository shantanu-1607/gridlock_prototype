import { AlertTriangle, ChevronRight, Clock, MapPin } from 'lucide-react'

import type { PlannedEvent } from '../types'

interface Props {
  events: PlannedEvent[]
  selectedId: string | null
  onSelect: (event: PlannedEvent) => void
}

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  critical: '#dc2626',
}

export default function EventList({ events, selectedId, onSelect }: Props) {
  if (events.length === 0) {
    return (
      <div className="event-list-empty">
        <AlertTriangle size={32} strokeWidth={1} />
        <p>No planned events</p>
        <span>Use the form above to plan a new event</span>
      </div>
    )
  }

  return (
    <div className="event-list">
      {events.map((ev) => {
        const riskColor = RISK_COLORS[ev.risk_level] || '#6b7280'
        const startTime = new Date(ev.start_datetime)
        const timeStr = startTime.toLocaleString('en-IN', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        const isSelected = ev.id === selectedId

        return (
          <div
            key={ev.id}
            className={`event-card ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect(ev)}
            style={{ borderLeftColor: riskColor }}
          >
            <div className="event-card-top">
              <span className="event-category">{ev.category}</span>
              <span className={`event-status status-${ev.status}`}>{ev.status}</span>
            </div>
            <div className="event-card-name">{ev.name || ev.category}</div>
            <div className="event-card-meta">
              <span>
                <Clock size={12} /> {timeStr}
              </span>
              <span>
                <MapPin size={12} /> {ev.lat?.toFixed(4)}, {ev.lon?.toFixed(4)}
              </span>
            </div>
            <div className="event-card-bottom">
              <span className="event-duration">
                {ev.predicted_duration_mins ? `${Math.round(ev.predicted_duration_mins)} min` : '—'}
              </span>
              <span className={`event-risk risk-${ev.risk_level}`} style={{ color: riskColor }}>
                {ev.risk_level?.toUpperCase() || 'UNKNOWN'}
              </span>
              <ChevronRight size={14} className="event-chevron" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
