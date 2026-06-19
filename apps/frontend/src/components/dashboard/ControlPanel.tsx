import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

import type { PlanEventPayload, PlannedEvent } from '../../types'
import EventList from '../events/EventList'
import PlanEventForm from '../events/PlanEventForm'

interface ControlPanelProps {
  loading: boolean
  error: string | null
  events: PlannedEvent[]
  selectedEvent: PlannedEvent | null
  onPlanSubmit: (payload: PlanEventPayload) => Promise<boolean>
  onEventSelect: (ev: PlannedEvent) => void
  onCloseEvent: (id: string) => void
}

export default function ControlPanel({
  loading,
  error,
  events,
  selectedEvent,
  onPlanSubmit,
  onEventSelect,
  onCloseEvent,
}: ControlPanelProps) {
  const navigate = useNavigate()

  const handleEventSelect = (ev: PlannedEvent) => {
    onEventSelect(ev)
    navigate('/dashboard/overview')
  }

  const handlePlanSubmit = async (payload: PlanEventPayload) => {
    const success = await onPlanSubmit(payload)
    if (success) navigate('/dashboard/overview')
  }

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col overflow-hidden border-l border-border bg-background shadow-sm">
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Control Panel</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Plan events and dispatch resources</p>
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="space-y-8 p-6 animate-fade-in">
          <section>
            <PlanEventForm onSubmit={handlePlanSubmit} loading={loading} />
            {error && (
              <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </section>

          <Separator />

          <section className="mb-20">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText size={16} />
                Recent Plans
              </h3>
            </div>
            <EventList
              events={events.slice(0, 10)}
              selectedId={selectedEvent?.id || null}
              onSelect={handleEventSelect}
              onClose={onCloseEvent}
            />
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
