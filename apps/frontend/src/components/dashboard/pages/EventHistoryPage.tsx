import { useOutletContext } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { DashboardOutletContext } from '../AppLayout'

export default function EventHistoryPage() {
  const { events } = useOutletContext<DashboardOutletContext>()

  return (
    <div className="h-full overflow-y-auto p-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Event History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete log of all planned and active events
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">All Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Name</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Address</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Category</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Priority</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Severity Score</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Duration</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No events found.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{event.name}</div>
                        {event.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {event.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground capitalize">
                          {Array.isArray((event as any).affected_corridors)
                            ? (event as any).affected_corridors.join(', ')
                            : (event as any).corridor || 'Unknown Corridor'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {event.lat?.toFixed(5) || 'N/A'}, {event.lon?.toFixed(5) || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4 capitalize">{event.category}</td>
                      <td className="py-3 px-4 capitalize">{(event as any).priority || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono">{Number(event.severity_score).toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono">
                          {event.predicted_duration_mins || (event as any).duration_mins || 0} min
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            event.status === 'active'
                              ? 'bg-orange/10 text-orange'
                              : event.status === 'planned'
                                ? 'bg-primary/10 text-primary'
                                : event.status === 'resolved' || event.status === 'closed'
                                  ? 'bg-green/10 text-green'
                                  : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
