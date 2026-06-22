import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  MapPin,
  Mic,
  Navigation,
  Send,
  Shield,
  Waypoints,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'

import { useAuth } from '../../hooks/useAuth'
import { useWebSocket } from '../../hooks/useWebSocket'
import type { FleetAssignment } from '../../types'
import { getMyAssignments, reportFieldIncident, updateMyAssignmentStatus } from '../../utils/api'
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
  const [reportType, setReportType] = useState('Vehicle Breakdown')
  const [reportDesc, setReportDesc] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [requiresBackup, setRequiresBackup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCameraView, setShowCameraView] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null)

  const handleSubmitReport = async () => {
    const reportLat = liveLocationRef.current?.lat || liveLocation?.lat || 12.9716
    const reportLon = liveLocationRef.current?.lon || liveLocation?.lon || 77.5946

    setIsSubmitting(true)
    try {
      await reportFieldIncident({
        type: 'unplanned',
        category: reportType,
        name: `Field Report: ${reportType}`,
        description: reportDesc,
        lat: reportLat,
        lon: reportLon,
        start_datetime: new Date().toISOString(),
        priority,
        requires_road_closure: requiresBackup,
      })

      // Simulate "AI Processing" time
      setTimeout(() => {
        setIsSubmitting(false)
        setShowReport(false)
        toast.success('Incident dispatched. GridLock AI is processing.')
        setReportDesc('')
        setPriority('Medium')
        setRequiresBackup(false)
      }, 1500)
    } catch (err) {
      console.error(err)
      toast.error('Failed to report incident.')
      setIsSubmitting(false)
    }
  }

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
    <div className="flex h-[100dvh] flex-col bg-background w-full border-border relative overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
        className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/90 backdrop-blur-xl px-4 z-20"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
            <Waypoints size={17} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-[13px] font-bold tracking-tight text-foreground leading-none">
              Fleet Ops
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
              {user?.role || 'Officer'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection */}
          {connected ? (
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">
              Offline
            </div>
          )}

          <ThemeToggle />

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
              onClick={logout}
            >
              <LogOut size={14} />
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col lg:flex-row-reverse flex-1 overflow-hidden"
      >
        {/* Top Pane - Map */}
        <main className="relative h-[45vh] lg:h-auto lg:flex-1 shrink-0 overflow-hidden z-0">
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

        {/* Bottom Pane - Assignments */}
        <aside className="flex flex-1 lg:flex-none lg:w-[400px] xl:w-[450px] flex-col overflow-hidden bg-card/95 backdrop-blur-md rounded-t-3xl lg:rounded-none border-t lg:border-t-0 lg:border-r border-border shadow-[0_-10px_40px_rgba(0,0,0,0.15)] lg:shadow-[10px_0_40px_rgba(0,0,0,0.05)] -mt-4 lg:mt-0 z-10 relative">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto my-3 shrink-0 lg:hidden" />
          <ScrollArea className="flex-1 px-4 pb-4 lg:pt-6">
            <div className="pb-6">
              {/* Heading */}
              <div className="mb-4 flex items-center justify-between">
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
                          <h3 className="text-[13px] font-bold text-foreground">
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

              <Separator className="my-5" />

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
                    <Card className="p-4 border-orange-500/30">
                      <h3 className="mb-3 text-[13px] font-bold text-foreground flex items-center">
                        <Activity className="mr-2 text-orange-500 animate-pulse" size={16} />
                        Live Field Report
                      </h3>
                      <div className="flex flex-col gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Incident Type
                          </label>
                          <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                            <option value="Accident">Accident</option>
                            <option value="Water Logging">Water Logging</option>
                            <option value="Tree Fall">Tree Fall</option>
                            <option value="Pot Holes">Pot Holes</option>
                            <option value="Others">Others</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Severity Level
                          </label>
                          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                            {['Critical', 'High', 'Medium', 'Low'].map((p) => (
                              <div
                                key={p}
                                onClick={() => setPriority(p)}
                                className={`flex-1 text-center py-1.5 text-[10px] font-bold uppercase cursor-pointer rounded-md transition-colors ${
                                  priority === p
                                    ? p === 'Critical'
                                      ? 'bg-destructive text-white'
                                      : p === 'High'
                                        ? 'bg-orange-500 text-white'
                                        : p === 'Medium'
                                          ? 'bg-yellow-500 text-white'
                                          : 'bg-emerald-500 text-white'
                                    : 'text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                {p}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Description
                          </label>
                          <textarea
                            value={reportDesc}
                            onChange={(e) => setReportDesc(e.target.value)}
                            placeholder="Provide details..."
                            rows={2}
                            className="flex min-h-[50px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>

                        <div className="flex items-center justify-between mt-1 mb-1">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setShowCameraView(true)
                                setTimeout(() => setShowCameraView(false), 800)
                              }}
                              className={`h-8 w-8 p-0 ${showCameraView ? 'border-emerald-500 text-emerald-500' : 'text-muted-foreground'}`}
                            >
                              <Camera
                                size={14}
                                className={showCameraView ? 'animate-bounce' : ''}
                              />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsRecordingVoice(true)
                                setTimeout(() => setIsRecordingVoice(false), 2000)
                              }}
                              className={`h-8 w-8 p-0 ${isRecordingVoice ? 'border-red-500 text-red-500 animate-pulse' : 'text-muted-foreground'}`}
                            >
                              <Mic size={14} />
                            </Button>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                              Req. Backup
                            </span>
                            <div
                              className={`w-8 h-4 rounded-full transition-colors relative ${requiresBackup ? 'bg-orange-500' : 'bg-muted'}`}
                              onClick={() => setRequiresBackup(!requiresBackup)}
                            >
                              <div
                                className={`absolute top-[2px] w-3 h-3 rounded-full bg-white transition-all ${requiresBackup ? 'left-[18px]' : 'left-[2px]'}`}
                              />
                            </div>
                          </label>
                        </div>

                        <div className="flex gap-2 mt-1">
                          <Button
                            variant="outline"
                            className="flex-1 h-9 text-xs"
                            onClick={() => setShowReport(false)}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="flex-1 h-9 bg-orange-500 hover:bg-orange-600 text-white text-xs"
                            onClick={handleSubmitReport}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 size={13} className="mr-1.5 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Send size={13} className="mr-1.5" />
                                Submit
                              </>
                            )}
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
      </motion.div>
    </div>
  )
}
