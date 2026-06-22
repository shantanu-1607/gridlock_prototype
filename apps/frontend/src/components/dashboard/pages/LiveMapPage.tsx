import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import MapplsMap from '../../map/MapplsMap'
import type { DashboardOutletContext } from '../AppLayout'
import LiveEventDetailsCard from './LiveEventDetailsCard'

const CRITICAL_MERGE_FLASH_MS = 4500
// Disabled: focusPoint below is a new object literal every render, and since
// `clock` re-renders this component every second, the map re-flies to the
// collision point on a 1s loop once lastCriticalMerge is set. Re-enable once
// lastCriticalMerge is cleared after the flash and focusPoint is memoized.
const CRITICAL_MERGE_ALERTS_ENABLED = false

export default function LiveMapPage() {
  const {
    eventLat,
    eventLon,
    pipelineResult,
    lastTick,
    lastCriticalMerge,
    activeEvents,
    selectedEvent,
    selectedEventAssignments,
    selectedEventBarricades,
    loadingDetails,
    onEventSelect,
    refetchEventDetails,
    liveFleetLocations,
  } = useOutletContext<DashboardOutletContext>()
  const [clock, setClock] = useState(new Date())
  const [isFlashing, setIsFlashing] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!CRITICAL_MERGE_ALERTS_ENABLED || !lastCriticalMerge) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFlashing(true)
    const timer = setTimeout(() => setIsFlashing(false), CRITICAL_MERGE_FLASH_MS)
    return () => clearTimeout(timer)
  }, [lastCriticalMerge])

  return (
    <div className="relative h-full w-full">
      <MapplsMap
        eventLat={eventLat}
        eventLon={eventLon}
        riskLevel={pipelineResult?.queue_analysis.risk_level}
        propagationTick={lastTick}
        pipeline={pipelineResult}
        activeEvents={activeEvents}
        selectedEvent={selectedEvent}
        onEventSelect={onEventSelect}
        assignments={selectedEventAssignments}
        barricades={selectedEventBarricades}
        liveFleetLocations={liveFleetLocations}
        focusPoint={
          CRITICAL_MERGE_ALERTS_ENABLED && lastCriticalMerge
            ? { lat: lastCriticalMerge.lat, lon: lastCriticalMerge.lon }
            : null
        }
      />

      <AnimatePresence>
        {isFlashing && (
          <motion.div
            key="critical-merge-flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-0 z-[2000] border-[12px] border-red-500/80"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute top-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-red-400 bg-red-600 px-5 py-2.5 shadow-2xl shadow-red-900/50"
            >
              <AlertTriangle className="h-5 w-5 animate-pulse text-white" />
              <span className="font-mono text-sm font-bold tracking-widest text-white animate-pulse">
                CRITICAL MERGE DETECTED
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && (
          <LiveEventDetailsCard
            key="live-event-details"
            event={selectedEvent}
            assignments={selectedEventAssignments}
            barricades={selectedEventBarricades}
            loading={loadingDetails}
            lastTick={lastTick?.eventId === selectedEvent.id ? lastTick : undefined}
            onClose={() => onEventSelect(null)}
            onAssignFleet={refetchEventDetails}
          />
        )}
      </AnimatePresence>

      <div className="absolute right-4 bottom-4 z-[1000] font-mono text-[28px] font-light tracking-wider text-muted-foreground opacity-60">
        {clock.toLocaleTimeString('en-IN', { hour12: false })}
      </div>
    </div>
  )
}
