import { motion } from 'framer-motion'
import {
  ArrowRight,
  Clock,
  Construction,
  Loader2,
  MapPin,
  Navigation,
  Send,
  Shield,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import type { PlannedEvent, PropagationTick } from '../../../types'
import { assignFleetMember, confirmBarricade } from '../../../utils/api'

interface Props {
  event: PlannedEvent
  assignments: any[]
  barricades: any[]
  loading: boolean
  lastTick?: PropagationTick
  onClose: () => void
  onAssignFleet?: () => void
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
          DEPLOYMENT REQUESTED
        </span>
      )
    case 'recommended':
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-dashed border-border">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
          PROPOSED
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

const getBarricadeStatusBadge = (status: string, isDemobilized?: boolean) => {
  if (isDemobilized) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md border border-green-500/25">
        SAFE TO DEMOBILIZE
      </span>
    )
  }

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
  lastTick,
  onClose,
  onAssignFleet,
}: Props) {
  const [elapsedMins, setElapsedMins] = useState(0)
  const [deployLoading, setDeployLoading] = useState<string | null>(null)
  const [deployAllLoading, setDeployAllLoading] = useState(false)
  const [barricadeDeployLoading, setBarricadeDeployLoading] = useState<string | null>(null)
  const [barricadeDeployAllLoading, setBarricadeDeployAllLoading] = useState(false)

  // Merge backend assignments with recommended ones
  const backendAssignments = assignments || []
  const recommendedDeployments =
    event.fleet_plan?.deployments || (event as any).deployment_plan?.deployments || []
  const recommendedList = recommendedDeployments.flatMap((d: any) =>
    d.assignedFleet.map((f: any) => ({
      id: `rec-${f.user_id}-${d.junctionName || d.junction}`,
      user_id: f.user_id,
      user_name: f.user_name,
      junction_name: d.junctionName || d.junction,
      role: d.role,
      priority: d.priority || 'Medium',
      status: 'recommended',
      isRecommended: true,
    })),
  )

  const displayAssignments = [...backendAssignments]
  recommendedList.forEach((rec: any) => {
    const exists = displayAssignments.some(
      (a) => a.user_id === rec.user_id && a.junction_name === rec.junction_name,
    )
    if (!exists) {
      displayAssignments.push(rec)
    }
  })

  const hasProposed = displayAssignments.some((a: any) => a.isRecommended)
  const displayOnSiteCount = displayAssignments.filter(
    (a: any) => a.status === 'on_site' || a.status === 'completed',
  ).length

  const handleDeploy = async (assignment: any) => {
    setDeployLoading(assignment.id)
    try {
      await assignFleetMember(
        event.id,
        assignment.user_id,
        assignment.junction_name,
        assignment.role,
        assignment.priority,
      )
      if (onAssignFleet) onAssignFleet()
    } catch (err) {
      console.error(err)
    } finally {
      setDeployLoading(null)
    }
  }

  const handleDeployAll = async () => {
    setDeployAllLoading(true)
    try {
      const pending = displayAssignments.filter((a: any) => a.isRecommended)
      await Promise.all(
        pending.map((a: any) =>
          assignFleetMember(event.id, a.user_id, a.junction_name, a.role, a.priority),
        ),
      )
      if (onAssignFleet) onAssignFleet()
    } catch (err) {
      console.error(err)
    } finally {
      setDeployAllLoading(false)
    }
  }

  const handleDeployBarricade = async (barricade: any) => {
    setBarricadeDeployLoading(barricade.id)
    try {
      await confirmBarricade(event.id, barricade.id)
      if (onAssignFleet) onAssignFleet()
    } catch (err) {
      console.error(err)
    } finally {
      setBarricadeDeployLoading(null)
    }
  }

  const handleDeployAllBarricades = async () => {
    setBarricadeDeployAllLoading(true)
    try {
      const pending = barricades.filter((b) => b.status === 'recommended')
      await Promise.all(pending.map((b) => confirmBarricade(event.id, b.id)))
      if (onAssignFleet) onAssignFleet()
    } catch (err) {
      console.error(err)
    } finally {
      setBarricadeDeployAllLoading(false)
    }
  }

  useEffect(() => {
    if (!event.start_datetime) return
    const startTime = new Date(event.start_datetime).getTime()

    const updateTimer = () => {
      const now = Date.now()
      setElapsedMins((now - startTime) / 60000)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 10000)
    return () => clearInterval(interval)
  }, [event.start_datetime])

  const predicted = event.predicted_duration_mins || 0
  const isRecovered = event.status === 'resolved' || event.status === 'closed'
  const isFuture = elapsedMins < 0
  const isOverdue = !isRecovered && !isFuture && elapsedMins >= predicted

  const startsInMins = Math.max(0, Math.ceil(-elapsedMins))
  const remainingMins = Math.max(0, Math.ceil(predicted - Math.max(0, elapsedMins)))
  const overdueMins = Math.floor(elapsedMins - predicted)

  // Calculate dynamic severity from the last tick
  const activeNodesArray = lastTick?.activeNodes ? Object.values(lastTick.activeNodes) : []
  const maxNodeIntensity = activeNodesArray.length
    ? Math.max(...activeNodesArray.map((n: any) => n.intensity))
    : 0

  // If the event is recovered, force to 0. Otherwise use the highest active node intensity,
  // falling back to initial event severity if no ticks have occurred yet.
  const currentSeverity = isRecovered ? 0 : lastTick ? maxNodeIntensity : event.severity_score

  const severityColor =
    currentSeverity > 0.85
      ? 'bg-red-500'
      : currentSeverity > 0.6
        ? 'bg-orange-500'
        : currentSeverity > 0.3
          ? 'bg-yellow-500'
          : 'bg-green-500'

  const severityLabel =
    currentSeverity > 0.85
      ? 'Critical'
      : currentSeverity > 0.6
        ? 'High'
        : currentSeverity > 0.3
          ? 'Medium'
          : 'Low'

  const confirmedBarricadesCount = barricades.filter((b) => b.status === 'confirmed').length

  const diversionRoutes = event.diversion_plan?.routes ?? []
  const diversionRationale = event.diversion_plan?.rationale

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        duration: 0.3,
      }}
      className="absolute top-4 right-4 z-[1000] w-96 max-h-[85vh] flex flex-col rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-2xl overflow-hidden"
    >
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
              <span className="font-mono text-lg font-bold text-foreground transition-all duration-500">
                {(currentSeverity * 10).toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">/ 10</span>
            </div>
            {/* Severity Progress Bar */}
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
              <div
                className={`h-full ${severityColor} transition-all duration-1000 ease-in-out`}
                style={{ width: `${currentSeverity * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">
              Label:{' '}
              <span className="text-foreground transition-colors duration-500">
                {severityLabel}
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-1 p-3 rounded-xl border border-border bg-muted/20 justify-between">
            <div>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase flex items-center gap-1">
                <Clock size={10} className="text-muted-foreground" />
                {isRecovered
                  ? 'Cleared In'
                  : isFuture
                    ? 'Starts In'
                    : isOverdue
                      ? 'Overdue By'
                      : 'Remaining Time'}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={`font-mono text-lg font-bold ${isOverdue && !isRecovered ? 'text-red-500' : 'text-foreground'}`}
                >
                  {isRecovered
                    ? Math.round(elapsedMins)
                    : isFuture
                      ? startsInMins
                      : isOverdue
                        ? overdueMins
                        : remainingMins}
                </span>
                <span className="text-xs text-muted-foreground">mins</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground leading-none">
              {isRecovered
                ? 'Total Incident Duration'
                : `Of ${Math.round(predicted)} mins predicted`}
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
            <div className="flex items-center gap-2">
              {hasProposed && (
                <button
                  onClick={handleDeployAll}
                  className="text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                >
                  {deployAllLoading ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Send size={10} />
                  )}
                  Deploy All
                </button>
              )}
              <span className="text-[10px] font-bold text-muted-foreground uppercase bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">
                {displayOnSiteCount} / {displayAssignments.length} Deployed
              </span>
            </div>
          </div>

          {displayAssignments.length === 0 ? (
            <div className="text-center py-4 rounded-xl border border-dashed border-border bg-muted/5 p-3">
              <UserCheck size={20} className="mx-auto text-muted-foreground opacity-40 mb-1" />
              <p className="text-xs text-muted-foreground">No personnel assigned to event</p>
              {(event as any).recommendation_rationale && (
                <p className="text-[10px] text-muted-foreground mt-2 italic px-2">
                  "{(event as any).recommendation_rationale}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {displayAssignments.map((assignment: any) => (
                <div
                  key={assignment.id}
                  className="relative group overflow-hidden flex items-center justify-between p-2 rounded-lg border border-border bg-background hover:bg-muted/10 transition-colors"
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

                  {assignment.isRecommended && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleDeploy(assignment)}
                        disabled={deployLoading === assignment.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        {deployLoading === assignment.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        Deploy {assignment.user_name.split(' ')[0]}
                      </button>
                    </div>
                  )}
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
            <div className="flex items-center gap-2">
              {barricades.some((b) => b.status === 'recommended') && (
                <button
                  onClick={handleDeployAllBarricades}
                  className="text-[10px] font-bold bg-orange-600 hover:bg-orange-700 text-white px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                >
                  {barricadeDeployAllLoading ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Send size={10} />
                  )}
                  Place All
                </button>
              )}
              <span className="text-[10px] font-bold text-muted-foreground uppercase bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full">
                {confirmedBarricadesCount} / {barricades.length} Placed
              </span>
            </div>
          </div>

          {barricades.length === 0 ? (
            <div className="text-center py-4 rounded-xl border border-dashed border-border bg-muted/5 p-3">
              <ShieldAlert size={20} className="mx-auto text-muted-foreground opacity-40 mb-1" />
              <p className="text-xs text-muted-foreground">No barricades recommended</p>
              {(event as any).barricade_rationale && (
                <p className="text-[10px] text-muted-foreground mt-2 italic px-2">
                  "{(event as any).barricade_rationale}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {barricades.map((barricade) => (
                <div
                  key={barricade.id}
                  className="relative group overflow-hidden flex items-center justify-between p-2 rounded-lg border border-border bg-background hover:bg-muted/10 transition-colors"
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
                  <div className="shrink-0 ml-2">
                    {getBarricadeStatusBadge(barricade.status, isRecovered)}
                  </div>

                  {barricade.status === 'recommended' && !isRecovered && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleDeployBarricade(barricade)}
                        disabled={barricadeDeployLoading === barricade.id}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-[10px] font-bold px-3 py-1 rounded shadow-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        {barricadeDeployLoading === barricade.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        Place Barricade
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diversion Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Navigation size={14} className="text-green-500" />
              Diversion Routes
            </span>
            <span className="text-[10px] font-bold uppercase bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">
              {diversionRoutes.length} Recommended
            </span>
          </div>

          {diversionRoutes.length === 0 ? (
            <div className="text-center py-4 rounded-xl border border-dashed border-border bg-muted/5 p-3">
              <Navigation size={20} className="mx-auto text-muted-foreground opacity-40 mb-1" />
              <p className="text-xs text-muted-foreground">No diversion recommended</p>
              {diversionRationale && (
                <p className="text-[10px] text-muted-foreground mt-2 italic px-2">
                  "{diversionRationale}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {diversionRoutes.map((route, i) => (
                <div
                  key={`${route.at_risk_corridor}-${route.via_corridor}-${i}`}
                  className="p-2.5 rounded-lg border border-green-500/20 bg-green-500/5"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground flex-wrap">
                    <span className="text-red-400">{route.at_risk_corridor}</span>
                    <ArrowRight size={12} className="text-muted-foreground shrink-0" />
                    <span className="text-green-400">via {route.via_corridor}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin size={10} className="shrink-0" />
                    Divert at {route.from.name}
                    {route.rejoins
                      ? ` • rejoin at ${route.to.name}`
                      : ` • hand off to ${route.to.name}`}
                  </div>
                  {route.reason && (
                    <p className="text-[10px] text-muted-foreground mt-1 italic leading-snug">
                      {route.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
