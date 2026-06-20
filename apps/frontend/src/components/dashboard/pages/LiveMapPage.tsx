import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import MapplsMap from '../../map/MapplsMap'
import type { DashboardOutletContext } from '../AppLayout'
import { ChatAssistant } from '../ChatAssistant'

export default function LiveMapPage() {
  const { eventLat, eventLon, pipelineResult, lastTick, activeEvents } =
    useOutletContext<DashboardOutletContext>()
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-full w-full">
      <MapplsMap
        eventLat={eventLat}
        eventLon={eventLon}
        riskLevel={pipelineResult?.queue_analysis.risk_level}
        propagationTick={lastTick}
        pipeline={pipelineResult}
        activeEvents={activeEvents}
      />

      <ChatAssistant />

      <div className="absolute right-4 bottom-4 z-[1000] font-mono text-[28px] font-light tracking-wider text-muted-foreground opacity-60">
        {clock.toLocaleTimeString('en-IN', { hour12: false })}
      </div>
    </div>
  )
}
