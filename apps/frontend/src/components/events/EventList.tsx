import { Calendar, ChevronRight, Clock, MapPin, X } from 'lucide-react'

import type { PlannedEvent } from '../../types'

interface Props {
  events: PlannedEvent[]
  selectedId: string | null
  onSelect: (event: PlannedEvent) => void
  onClose?: (id: string) => void
}

const STATUS_CLASSES: Record<string, string> = {
  planned: 'bg-primary/15 text-primary',
  active: 'bg-green/15 text-green',
  closed: 'bg-muted-foreground/15 text-muted-foreground',
}

export default function EventList({ events, selectedId, onSelect, onClose }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <Calendar size={24} className="opacity-50" />
        <p className="text-sm font-medium">No events planned</p>
        <span className="text-xs">Create your first event above</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((ev) => {
        const isSelected = ev.id === selectedId
        return (
          <button
            key={ev.id}
            onClick={() => onSelect(ev)}
            className={`group w-full cursor-pointer rounded-lg border-l-[3px] border bg-card p-3 text-left transition-all duration-200 hover:bg-accent ${
              isSelected
                ? 'border-primary border-l-accent bg-primary/5'
                : 'border-border border-l-muted-foreground/30 hover:border-primary/50'
            }`}
          >
            {/* Top row */}
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                {ev.category}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                    STATUS_CLASSES[ev.status] || STATUS_CLASSES.closed
                  }`}
                >
                  {ev.status}
                </span>
                {onClose && ev.status !== 'closed' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      onClose(ev.id)
                    }}
                    className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Close Event"
                  >
                    <X size={14} />
                  </div>
                )}
              </div>
            </div>

            {/* Name */}
            <p className="mb-1.5 truncate text-[13px] font-semibold text-foreground">{ev.name}</p>

            {/* Meta */}
            <div className="mb-2 flex gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {ev.lat.toFixed(2)}, {ev.lon.toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(ev.start_datetime).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
            </div>

            {/* Bottom row */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground">
                {Math.round(ev.predicted_duration_mins || 0)} min
              </span>
              <div className="flex items-center gap-2">
                {ev.risk_level && (
                  <span
                    className={`font-mono text-[10px] font-bold tracking-wider ${
                      ev.risk_level === 'critical'
                        ? 'text-critical'
                        : ev.risk_level === 'red'
                          ? 'text-red'
                          : ev.risk_level === 'orange'
                            ? 'text-orange'
                            : ev.risk_level === 'yellow'
                              ? 'text-yellow'
                              : 'text-green'
                    }`}
                  >
                    {ev.risk_level.toUpperCase()}
                  </span>
                )}
                <ChevronRight
                  size={14}
                  className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
