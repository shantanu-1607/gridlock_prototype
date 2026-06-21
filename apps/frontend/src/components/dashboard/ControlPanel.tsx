import { AnimatePresence, motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
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
  }

  const handlePlanSubmit = async (payload: PlanEventPayload) => {
    const success = await onPlanSubmit(payload)
    if (success) navigate('/dashboard/overview')
  }

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1], delay: 0.15 }}
      className="flex h-full w-[360px] shrink-0 flex-col overflow-hidden border-l border-border bg-card/50 backdrop-blur-sm"
    >
      <div className="shrink-0 border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-bold tracking-tight text-foreground">Control Panel</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Plan events & dispatch resources</p>
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="space-y-6 p-5">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
          >
            <PlanEventForm onSubmit={handlePlanSubmit} loading={loading} />
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-3 overflow-hidden"
                >
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          <Separator />

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
            className="mb-20"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} />
                Recent Plans
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] px-2"
                onClick={() => navigate('/dashboard/history')}
              >
                View All
              </Button>
            </div>
            <EventList
              events={events.slice(0, 10)}
              selectedId={selectedEvent?.id || null}
              onSelect={handleEventSelect}
              onClose={onCloseEvent}
            />
          </motion.section>
        </div>
      </ScrollArea>
    </motion.aside>
  )
}
