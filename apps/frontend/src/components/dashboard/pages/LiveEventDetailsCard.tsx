import {
  Clock,
  Construction,
  Loader2,
  MapPin,
  Shield,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react'

import type { PlannedEvent } from '../../../types'

interface Props {
  event: PlannedEvent
  assignments: any[]
  barricades: any[]
  loading: boolean
  onClose: () => void
}

const getFleetStatusBadge = (status: string) => {
  switch (status) {
    case 'on_site':
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          ON SITE
        </span>
      )
    case 'completed':
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          COMPLETED
        </span>
      )
    case 'en_route':
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" />
          EN ROUTE
        </span>
      )
    case 'pending':
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          PENDING
        </span>
      )
    case 'blocked':
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          BLOCKED
        </span>
      )
    default:
      return (
        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md uppercase">
          {status}
        </span>
      )
  }
}

const getBarricadeStatusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
          ACTIVE
        </span>
      )
    case 'recommended':
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-dashed border-yellow-500/25">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          PROPOSED
        </span>
      )
    case 'removed':
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
          REMOVED
        </span>
      )
    default:
      return <span className="text-[10px] font-bold text-muted-foreground uppercase">{status}</span>
  }
}

export default function LiveEventDetailsCard({
  event,
  assignments,
  barricades,
  loading,
  onClose,
}: Props) {
  const onSiteCount = assignments.filter(
    (a) => a.status === 'on_site' || a.status === 'completed',
  ).length
  const confirmedBarricadesCount = barricades.filter((b) => b.status === 'confirmed').length

  const severityColor =
    event.severity_score > 0.85
      ? 'bg-red-500'
      : event.severity_score > 0.6
        ? 'bg-orange-500'
        : event.severity_score > 0.3
          ? 'bg-yellow-500'
          : 'bg-green-500'

  const severityLabel =
    event.severity_score > 0.85
      ? 'Critical'
      : event.severity_score > 0.6
        ? 'High'
        : event.severity_score > 0.3
          ? 'Medium'
          : 'Low'

  return (
    <div className="absolute top-4 right-4 z-[1000] w-96 max-h-[85vh] flex flex-col rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border/80 flex items-start justify-between bg-muted/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-primary/10 text-primary uppercase tracking-wider">
              {event.category}
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded text-white capitalize ${
                event.status === 'active' ? 'bg-red-600 animate-pulse' : 'bg-blue-600'
              }`}
            >
              {event.status}
            </span>
          </div>
          <h3 className="font-bold text-foreground text-base tracking-tight leading-snug">
            {event.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Loader when API is fetching updates */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground bg-muted/20 rounded-lg">
            <Loader2 size={12} className="animate-spin text-primary" />
            Syncing live dispatch statuses...
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1 p-3 rounded-xl border border-border bg-muted/20">
            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Severity Score
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-bold text-foreground">
                {(event.severity_score * 10).toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">/ 10</span>
            </div>
            {/* Severity Progress Bar */}
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
              <div
                className={`h-full ${severityColor}`}
                style={{ width: `${event.severity_score * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              Label: <span className="text-foreground">{severityLabel}</span>
            </span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl border border-border bg-muted/20 justify-between">
            <div>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                <Clock size={10} className="text-muted-foreground" />
                Duration
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-mono text-lg font-bold text-foreground">
                  {Math.round(event.predicted_duration_mins || 0)}
                </span>
                <span className="text-xs text-muted-foreground">mins</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground leading-none">
              Predicted Incident Term
            </span>
          </div>
        </div>

        {/* Fleet Deployment Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Shield size={14} className="text-blue-500" />
              Fleet Deployment
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">
              {onSiteCount} / {assignments.length} Deployed
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-4 rounded-xl border border-dashed border-border bg-muted/5">
              <UserCheck size={20} className="mx-auto text-muted-foreground opacity-40 mb-1" />
              <p className="text-xs text-muted-foreground">No personnel assigned to event</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-border bg-background hover:bg-muted/10 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                      <MapPin size={10} className="text-muted-foreground shrink-0" />
                      {assignment.junction_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate capitalize">
                      {assignment.user_name} • {assignment.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="shrink-0 ml-2">{getFleetStatusBadge(assignment.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Barricades Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Construction size={14} className="text-orange-500" />
              Barricade Layout
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full">
              {confirmedBarricadesCount} / {barricades.length} Placed
            </span>
          </div>

          {barricades.length === 0 ? (
            <div className="text-center py-4 rounded-xl border border-dashed border-border bg-muted/5">
              <ShieldAlert size={20} className="mx-auto text-muted-foreground opacity-40 mb-1" />
              <p className="text-xs text-muted-foreground">No barricades recommended</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {barricades.map((barricade) => (
                <div
                  key={barricade.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-border bg-background hover:bg-muted/10 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                      <MapPin size={10} className="text-muted-foreground shrink-0" />
                      {barricade.location_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate capitalize">
                      {barricade.type.replace(/_/g, ' ')} •{' '}
                      {barricade.rule_source.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="shrink-0 ml-2">{getBarricadeStatusBadge(barricade.status)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
