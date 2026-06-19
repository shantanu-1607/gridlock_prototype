import { Activity, FileText, LayoutDashboard } from 'lucide-react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

import type { PipelineResult, PlanEventPayload, PlannedEvent } from '../../types'
import type { CounterfactualResult } from '../../types'
import PipelinePanel from '../analysis/PipelinePanel'
import EventList from '../events/EventList'
import PlanEventForm from '../events/PlanEventForm'

type View = 'form' | 'results'

interface SidebarProps {
  view: View
  setView: (v: View) => void
  loading: boolean
  error: string | null
  pipelineResult: PipelineResult | null
  events: PlannedEvent[]
  selectedEvent: PlannedEvent | null
  onPlanSubmit: (payload: PlanEventPayload) => void
  onEventSelect: (ev: PlannedEvent) => void
  onBackToForm: () => void
  onCloseEvent: (id: string) => void
}

export default function Sidebar({
  view,
  setView,
  loading,
  error,
  pipelineResult,
  events,
  selectedEvent,
  onPlanSubmit,
  onEventSelect,
  onBackToForm,
  onCloseEvent,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-[400px] shrink-0 flex-col overflow-hidden border-r border-border bg-background shadow-sm">
      {/* Header/Tabs Area */}
      <div className="flex shrink-0 border-b border-border bg-card">
        <button
          className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-all duration-200 ${
            view === 'form'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
          onClick={onBackToForm}
        >
          <LayoutDashboard size={18} />
          Control Panel
        </button>
        <button
          className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-all duration-200 ${
            view === 'results'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          } disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={() => pipelineResult && setView('results')}
          disabled={!pipelineResult}
        >
          <Activity size={18} />
          Analysis
        </button>
      </div>

      {/* Main Scrollable Content */}
      <ScrollArea className="flex-1 h-full">
        <div className="p-6">
          {view === 'form' ? (
            <div className="space-y-8 animate-fade-in">
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Plan New Event</h2>
                </div>
                <PlanEventForm onSubmit={onPlanSubmit} loading={loading} />
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
                  onSelect={onEventSelect}
                  onClose={onCloseEvent}
                />
              </section>
            </div>
          ) : pipelineResult ? (
            <div className="animate-slide-up">
              <PipelinePanel
                result={pipelineResult}
                counterfactual={selectedEvent?.counterfactual as CounterfactualResult | undefined}
              />
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  )
}
