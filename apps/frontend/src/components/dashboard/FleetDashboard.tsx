import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  Navigation,
  Send,
  Shield,
  Waypoints,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'

import { useAuth } from '../../hooks/useAuth'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { FleetAssignment } from '../../types'
import { getMyAssignments, updateMyAssignmentStatus } from '../../utils/api'
import { fetchRoute } from '../../utils/mappls'
import MapplsMap from '../map/MapplsMap'

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-destructive text-destructive-foreground',
  High: 'bg-orange-500 text-white',
  Medium: 'bg-yellow-500 text-white',
  Low: 'bg-emerald-500 text-white',
}

const STATUS_FLOW = ['pending', 'en_route', 'on_site', 'completed'] as const

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.4, 0.25, 1] },
  },
}

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
}

export default function FleetDashboard() {
  const { user, logout } = useAuth()
  const { connected, sendMessage } = useWebSocket()
  const [assignments, setAssignments] = useState<FleetAssignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<FleetAssignment | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [reportType, setReportType] = useState('vehicle_breakdown')
  const [reportDesc, setReportDesc] = useState('')
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null)

  const fetchAssignments = async () => {
    try {
      const data = await getMyAssignments()
      setAssignments(data)
      setSelectedAssignment((prev) => {
        if (!prev) return data.length > 0 ? data[0] : null
        const updated = data.find((a: FleetAssignment) => a.id === prev.id)
        return updated || prev
      })
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAssignments()
    const interval = setInterval(fetchAssignments, 15000)
    return () => clearInterval(interval)
  }, [])

  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const liveLocationRef = React.useRef<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    const activeAssignment = assignments.find((a) => a.status === 'en_route')
    if (!activeAssignment || !user) {
      liveLocationRef.current = null
      return
    }

    if (!liveLocationRef.current) {
      liveLocationRef.current = {
        lat: (activeAssignment.event_lat || 12.9716) - 0.015,
        lon: (activeAssignment.event_lon || 77.5946) - 0.015,
      }
      setLiveLocation(liveLocationRef.current)
    }

    const targetLat = activeAssignment.event_lat || 12.9716
    const targetLon = activeAssignment.event_lon || 77.5946

    // Fetch route for highlighted path
    if (!routePath) {
      fetchRoute(
        [liveLocationRef.current.lat, liveLocationRef.current.lon],
        [targetLat, targetLon],
      ).then((route) => {
        if (route) setRoutePath(route)
      })
    }

    const interval = setInterval(() => {
      if (!liveLocationRef.current) return
      const current = liveLocationRef.current

      const newLat = current.lat + (targetLat - current.lat) * 0.15
      const newLon = current.lon + (targetLon - current.lon) * 0.15
      const newLoc = { lat: newLat, lon: newLon }
      liveLocationRef.current = newLoc
      setLiveLocation(newLoc)

      if (connected) {
        sendMessage('fleet:location_update', {
          userId: (user as any).id || '',
          userName: user.name || user.email,
          role: activeAssignment.role,
          lat: newLat,
          lon: newLon,
        })
      }

      const dist = getDistanceFromLatLonInM(newLat, newLon, targetLat, targetLon)
      if (dist < 50) {
        clearInterval(interval)
        updateMyAssignmentStatus(activeAssignment.id, 'on_site').then(() => {
          fetchAssignments()
        })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [assignments, user, connected, sendMessage])

  const updateStatus = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const assignment = assignments.find((a) => a.id === id)
    if (!assignment) return
    const currentIdx = STATUS_FLOW.indexOf(assignment.status as (typeof STATUS_FLOW)[number])
    if (currentIdx < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[currentIdx + 1]
      try {
        await updateMyAssignmentStatus(id, nextStatus)
        fetchAssignments()
      } catch (err) {
        console.error(err)
      }
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Accept Orders'
      case 'en_route':
        return 'Arrived on Site'
      case 'on_site':
        return 'Mark Complete'
      case 'completed':
        return 'Done'
      default:
        return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Navigation size={14} />
      case 'en_route':
        return <MapPin size={14} />
      case 'on_site':
        return <CheckCircle2 size={14} />
      case 'completed':
        return <CheckCircle2 size={14} />
      default:
        return null
    }
  }

  const pendingCount = assignments.filter((a) => a.status !== 'completed').length

  return (
    <div className="flex h-screen flex-col bg-background dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-slate-900 dark:to-slate-950">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
        className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-6 z-10"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Waypoints size={17} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">
              Field Operations
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
              {user?.role || 'Fleet Officer'} · {user?.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection */}
          {connected ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
              Offline
            </div>
          )}

          <ThemeToggle />

          <div className="h-6 w-px bg-border" />

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8"
              onClick={logout}
            >
              <LogOut size={14} className="mr-1.5" />
              Logout
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-1 overflow-hidden"
      >
        {/* Left Pane - Assignments */}
        <aside className="flex h-full w-[420px] shrink-0 flex-col overflow-hidden border-r border-border bg-card/50 backdrop-blur-sm relative z-10">
          <ScrollArea className="flex-1 h-full">
            <div className="p-5">
              {/* Heading */}
              <div className="mb-5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
                  <Shield size={16} className="text-emerald-500" />
                  Assignments
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {pendingCount} Active
                </span>
              </div>

              {/* Assignment Cards */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="flex flex-col gap-3"
              >
                {assignments.map((assignment) => (
                  <motion.div key={assignment.id} variants={cardVariants} layout>
                    <Card
                      className={`p-4 transition-all duration-200 cursor-pointer hover:border-emerald-500/40 ${
                        selectedAssignment?.id === assignment.id
                          ? 'border-emerald-500 ring-1 ring-emerald-500/20 shadow-sm'
                          : 'border-border'
                      } ${assignment.status === 'completed' ? 'opacity-50' : ''}`}
                      onClick={() => setSelectedAssignment(assignment)}
                    >
                      {/* Top row */}
                      <div className="mb-3 flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            {assignment.junction_name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                            {assignment.role.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PRIORITY_STYLES[assignment.priority] || PRIORITY_STYLES.Medium}`}
                        >
                          {assignment.priority}
                        </span>
                      </div>

                      {/* Meta */}
                      <div className="mb-3 flex gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Clock size={12} />
                          {new Date(assignment.deploy_by_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={12} />
                          {assignment.event_lat ? assignment.event_lat.toFixed(3) : 'N/A'},{' '}
                          {assignment.event_lon ? assignment.event_lon.toFixed(3) : 'N/A'}
                        </span>
                      </div>

                      {/* Status bar */}
                      <div className="mb-4 flex gap-1">
                        {STATUS_FLOW.map((s, i) => (
                          <motion.div
                            key={s}
                            className={`h-1 flex-1 rounded-full ${
                              STATUS_FLOW.indexOf(
                                assignment.status as (typeof STATUS_FLOW)[number],
                              ) >= i
                                ? 'bg-emerald-500'
                                : 'bg-muted'
                            }`}
                            initial={false}
                            animate={{
                              opacity:
                                STATUS_FLOW.indexOf(
                                  assignment.status as (typeof STATUS_FLOW)[number],
                                ) >= i
                                  ? 1
                                  : 0.4,
                            }}
                            transition={{ duration: 0.3 }}
                          />
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {assignment.status !== 'completed' && (
                          <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
                            <Button
                              onClick={(e) => updateStatus(assignment.id, e)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs"
                            >
                              {getStatusIcon(assignment.status)}
                              <span className="ml-1.5">{getStatusLabel(assignment.status)}</span>
                            </Button>
                          </motion.div>
                        )}
                        {assignment.status === 'completed' && (
                          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-500/10 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={14} />
                            Completed
                          </div>
                        )}
                        <motion.div whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (assignment.event_lat && assignment.event_lon) {
                                window.open(
                                  `https://maps.google.com/?q=${assignment.event_lat},${assignment.event_lon}`,
                                  '_blank',
                                )
                              }
                            }}
                            title="Navigate via Google Maps"
                          >
                            <Navigation size={14} className="text-muted-foreground" />
                          </Button>
                        </motion.div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              <Separator className="my-6" />

              {/* Report Incident */}
              <AnimatePresence mode="wait">
                {!showReport ? (
                  <motion.div
                    key="report-button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full h-11 border-orange-500/30 bg-orange-500/5 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700 hover:border-orange-500/50 text-xs font-semibold"
                      onClick={() => setShowReport(true)}
                    >
                      <AlertCircle size={15} className="mr-2" />
                      Report Field Incident
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="report-form"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="p-5 border-orange-500/30">
                      <h3 className="mb-4 text-sm font-bold text-foreground">Incident Report</h3>
                      <div className="flex flex-col gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Type
                          </label>
                          <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="vehicle_breakdown">Vehicle Breakdown</option>
                            <option value="accident">Accident</option>
                            <option value="water_logging">Water Logging</option>
                            <option value="tree_fall">Tree Fall</option>
                            <option value="pot_holes">Pot Holes</option>
                            <option value="others">Others</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Description
                          </label>
                          <textarea
                            value={reportDesc}
                            onChange={(e) => setReportDesc(e.target.value)}
                            placeholder="Provide details..."
                            rows={3}
                            className="flex min-h-[70px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>

                        <div className="flex gap-2 mt-1">
                          <Button
                            variant="outline"
                            className="flex-1 h-9 text-xs"
                            onClick={() => setShowReport(false)}
                          >
                            Cancel
                          </Button>
                          <Button className="flex-1 h-9 bg-orange-500 hover:bg-orange-600 text-white text-xs">
                            <Send size={13} className="mr-1.5" />
                            Submit
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </aside>

        {/* Right Pane - Map */}
        <main className="relative flex-1 overflow-hidden z-0">
          <MapplsMap
            eventLat={selectedAssignment?.event_lat || 12.9716}
            eventLon={selectedAssignment?.event_lon || 77.5946}
            riskLevel={
              selectedAssignment?.priority === 'Critical'
                ? 'critical'
                : selectedAssignment?.priority === 'High'
                  ? 'red'
                  : 'yellow'
            }
            propagationTick={null}
            pipeline={null}
            selectedEvent={
              selectedAssignment
                ? ({
                    id: selectedAssignment.event_id,
                    lat: selectedAssignment.event_lat,
                    lon: selectedAssignment.event_lon,
                    category: 'Accident',
                    severity_score: selectedAssignment.priority === 'Critical' ? 0.9 : 0.5,
                    status: 'active',
                  } as any)
                : null
            }
            assignments={
              selectedAssignment ? [{ ...selectedAssignment, user_id: (user as any).id || '' }] : []
            }
            liveFleetLocations={
              liveLocation
                ? {
                    [(user as any).id || '']: {
                      userId: (user as any).id || '',
                      lat: liveLocation.lat,
                      lon: liveLocation.lon,
                    },
                  }
                : undefined
            }
            fleetRoute={
              selectedAssignment &&
              selectedAssignment.status !== 'completed' &&
              selectedAssignment.status !== 'on_site'
                ? routePath
                : null
            }
          />
        </main>
      </motion.div>
    </div>
  )
}
