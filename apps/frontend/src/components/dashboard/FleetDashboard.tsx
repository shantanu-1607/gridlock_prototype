import {
  AlertCircle,
  CheckCircle2,
  Clock,
  LogOut,
  MapPin,
  Navigation,
  Radio,
  Send,
  Shield,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

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
  Low: 'bg-green-500 text-white',
}

const STATUS_FLOW = ['pending', 'en_route', 'on_site', 'completed'] as const

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
        [targetLat, targetLon]
      ).then(route => {
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

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#10b981] text-white shadow-sm">
            <Radio size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">
              Field Operations
            </h1>
            <p className="text-xs font-medium text-muted-foreground mt-1 capitalize">
              {user?.role || 'Fleet Officer'} • {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={logout}
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </header>

      {/* Main Content Area (Split Screen) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane - Assignments */}
        <aside className="flex h-full w-[450px] shrink-0 flex-col overflow-hidden border-r border-border bg-background shadow-sm relative z-10">
          <ScrollArea className="flex-1 h-full">
            <div className="p-6">
              {/* Active assignments heading */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                  <Shield size={20} className="text-[#10b981]" />
                  Assignments
                </h2>
                <span className="rounded-full bg-[#10b981]/10 px-3 py-1 text-xs font-bold text-[#10b981]">
                  {assignments.filter((a) => a.status !== 'completed').length} Pending
                </span>
              </div>

              {/* Assignment Cards */}
              <div className="flex flex-col gap-4">
                {assignments.map((assignment) => (
                  <Card
                    key={assignment.id}
                    className={`p-5 transition-all duration-200 cursor-pointer border-2 hover:border-[#10b981]/50 ${
                      selectedAssignment?.id === assignment.id
                        ? 'border-[#10b981] ring-2 ring-[#10b981]/20 shadow-md'
                        : 'border-border'
                    } ${assignment.status === 'completed' ? 'opacity-60 bg-[#10b981]/5' : ''}`}
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    {/* Top row */}
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          {assignment.junction_name}
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground capitalize">
                          {assignment.role.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${PRIORITY_STYLES[assignment.priority] || PRIORITY_STYLES.Medium}`}
                      >
                        {assignment.priority}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <Clock size={16} />
                        {new Date(assignment.deploy_by_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin size={16} />
                        {assignment.event_lat ? assignment.event_lat.toFixed(3) : 'N/A'},{' '}
                        {assignment.event_lon ? assignment.event_lon.toFixed(3) : 'N/A'}
                      </span>
                    </div>

                    {/* Status bar */}
                    <div className="mb-5 flex gap-1.5">
                      {STATUS_FLOW.map((s, i) => (
                        <div
                          key={s}
                          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            STATUS_FLOW.indexOf(
                              assignment.status as (typeof STATUS_FLOW)[number],
                            ) >= i
                              ? 'bg-[#10b981]'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      {assignment.status !== 'completed' && (
                        <Button
                          onClick={(e) => updateStatus(assignment.id, e)}
                          className="flex-1 bg-[#10b981] hover:bg-[#059669] text-white"
                        >
                          {getStatusIcon(assignment.status)}
                          <span className="ml-2">{getStatusLabel(assignment.status)}</span>
                        </Button>
                      )}
                      {assignment.status === 'completed' && (
                        <div className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#10b981]/10 py-2 text-sm font-bold text-[#10b981]">
                          <CheckCircle2 size={16} />
                          Mission Accomplished
                        </div>
                      )}
                      <Button
                        variant="outline"
                        className="px-4"
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
                        <Navigation size={16} className="text-muted-foreground" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              <Separator className="my-8" />

              {/* Report Incident */}
              <div className="w-full">
                {!showReport ? (
                  <Button
                    variant="outline"
                    className="w-full h-14 border-orange-500/30 bg-orange-500/5 text-orange-600 hover:bg-orange-500/10 hover:text-orange-700 hover:border-orange-500/50"
                    onClick={() => setShowReport(true)}
                  >
                    <AlertCircle size={18} className="mr-2" />
                    Report Field Incident
                  </Button>
                ) : (
                  <Card className="p-6 border-orange-500/30 animate-slide-up">
                    <h3 className="mb-4 text-lg font-bold text-foreground">Incident Report Form</h3>
                    <div className="flex flex-col gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Incident Type</label>
                        <select
                          value={reportType}
                          onChange={(e) => setReportType(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="vehicle_breakdown">Vehicle Breakdown</option>
                          <option value="accident">Accident</option>
                          <option value="water_logging">Water Logging</option>
                          <option value="tree_fall">Tree Fall</option>
                          <option value="pot_holes">Pot Holes</option>
                          <option value="others">Others</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Description</label>
                        <textarea
                          value={reportDesc}
                          onChange={(e) => setReportDesc(e.target.value)}
                          placeholder="Provide details about the incident..."
                          rows={3}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                      </div>

                      <div className="flex gap-3 mt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowReport(false)}
                        >
                          Cancel
                        </Button>
                        <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
                          <Send size={16} className="mr-2" />
                          Submit Report
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
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
                    category: 'Accident', // Fallback to get an icon
                    severity_score: selectedAssignment.priority === 'Critical' ? 0.9 : 0.5,
                    status: 'active',
                  } as any)
                : null
            }
            assignments={
              selectedAssignment
                ? [{ ...selectedAssignment, user_id: (user as any).id || '' }]
                : []
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
      </div>
    </div>
  )
}
