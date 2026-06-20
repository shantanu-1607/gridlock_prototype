import { Loader2, Map } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { useMapplsMap } from '../../hooks/useMapplsMap'
import type { PipelineResult, PlannedEvent, PropagationTick } from '../../types'
import { fetchRoute } from '../../utils/mappls'

const getCategoryIconSvg = (category: string) => {
  const norm = category?.toLowerCase().trim() || ''
  if (norm.includes('accident')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  }
  if (norm.includes('protest')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`
  }
  if (norm.includes('vip') || norm.includes('movement')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 20h14"/></svg>`
  }
  if (norm.includes('water') || norm.includes('logging') || norm.includes('flood')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6 0 1.2-.4 1.4-1C3.8 4.4 4.4 4 5 4s1.2.4 1.4 1c.2.6.8 1 1.4 1s1.2-.4 1.4-1C9.8 4.4 10.4 4 11 4s1.2.4 1.4 1c.2.6.8 1 1.4 1s1.2-.4 1.4-1c.2-.6.8-1 1.4-1s1.2.4 1.4 1c.2.6.8 1 1.4 1"/><path d="M2 12c.6 0 1.2-.4 1.4-1 .2-.6.8-1 1.4-1s1.2.4 1.4 1c.2.6.8 1 1.4 1s1.2-.4 1.4-1c.2-.6.8-1 1.4-1s1.2.4 1.4 1c.2.6.8 1 1.4 1s1.2-.4 1.4-1c.2-.6.8-1 1.4-1s1.2.4 1.4 1"/><path d="M2 18c.6 0 1.2-.4 1.4-1 .2-.6.8-1 1.4-1s1.2.4 1.4 1c.2.6.8 1 1.4 1s1.2-.4 1.4-1c.2-.6.8-1 1.4-1s1.2.4 1.4 1c.2.6.8 1 1.4 1s1.2-.4 1.4-1c.2-.6.8-1 1.4-1s1.2.4 1.4 1"/></svg>`
  }
  if (norm.includes('tree') || norm.includes('fall')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13V20"/><path d="m18 13-6-6-6 6h12Z"/><path d="M12 2v5"/><path d="m17 7-5-5-5 5h10Z"/></svg>`
  }
  if (norm.includes('public') || norm.includes('event')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`
  }
  if (norm.includes('procession')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-2.38C4 11.5 5.88 9.85 6 7.07l.02-1.85a3.45 3.45 0 0 1 1.96-3A1.91 1.91 0 0 1 10 3.82c0 .94-.48 2-1 3.53a8.87 8.87 0 0 0-.5 3.39c0 1.25.68 2.5 1.5 3.12l1 1.76"/><path d="M12 12.5V10c0-1.74 1.3-3.08 1.4-5.22l.01-1.42A2.43 2.43 0 0 1 14.82.88 1.34 1.34 0 0 1 16.2 2c0 .7-.34 1.5-.7 2.65a6.22 6.22 0 0 0-.35 2.54c0 .94.48 1.88 1.05 2.34l.7 1.32c.7 1.13.9 2.52.9 3.65V16.5"/></svg>`
  }
  if (norm.includes('construction') || norm.includes('work')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12l4 10H2z"/><path d="M6 22H18l-2-10H8z"/><path d="M12 2v20"/></svg>`
  }
  if (norm.includes('congestion') || norm.includes('traffic')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="18" x="8" y="3" rx="4"/><path d="M12 8h.01"/><path d="M12 12h.01"/><path d="M12 16h.01"/></svg>`
  }
  if (norm.includes('breakdown') || norm.includes('vehicle')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`
  }
  if (norm.includes('condition') || norm.includes('road')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
}

const getFleetMarkerHtml = (status: string) => {
  const isOnSite = status === 'on_site' || status === 'completed'
  const color = isOnSite ? '#3b82f6' : '#6b7280'
  const isEnRoute = status === 'en_route'
  const shadow = isOnSite ? 'box-shadow: 0 0 10px #3b82f6;' : ''
  const border = isOnSite ? 'border: 2px solid white;' : 'border: 2px dashed #9ca3af;'
  const opacity = isOnSite ? '1.0' : '0.85'
  const pulse = isEnRoute ? 'animation: fleet-pulse 1.5s infinite ease-in-out;' : ''

  return `
    <div style="
      display: flex; 
      align-items: center; 
      justify-content: center; 
      width: 24px; 
      height: 24px; 
      border-radius: 50%; 
      background-color: ${color}; 
      ${border}
      ${shadow}
      opacity: ${opacity};
      ${pulse}
      color: white;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>
    </div>
  `
}

const getBarricadeMarkerHtml = (status: string) => {
  const isConfirmed = status === 'confirmed'
  const color = isConfirmed ? '#f97316' : '#6b7280'
  const shadow = isConfirmed ? 'box-shadow: 0 0 10px #f97316;' : ''
  const border = isConfirmed ? 'border: 2px solid white;' : 'border: 2px dashed #9ca3af;'
  const opacity = isConfirmed ? '1.0' : '0.85'

  return `
    <div style="
      display: flex; 
      align-items: center; 
      justify-content: center; 
      width: 24px; 
      height: 24px; 
      border-radius: 50%; 
      background-color: ${color}; 
      ${border}
      ${shadow}
      opacity: ${opacity};
      color: white;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12l4 10H2z"/><path d="M6 22H18l-2-10H8z"/><path d="M12 2v20"/></svg>
    </div>
  `
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  critical: '#dc2626',
}

const getScoreColor = (score: number) => {
  if (score > 0.85) return RISK_COLORS.critical
  if (score > 0.6) return RISK_COLORS.red
  if (score > 0.3) return RISK_COLORS.orange
  if (score > 0.15) return RISK_COLORS.yellow
  return RISK_COLORS.low
}

const getEventColor = (event: PlannedEvent) => {
  return getScoreColor(event.severity_score || 0.5)
}

const FORECAST_STEPS = [
  { label: 'NOW', mins: 0, scale: 1.0 },
  { label: '+5', mins: 5, scale: 1.3 },
  { label: '+10', mins: 10, scale: 1.55 },
  { label: '+15', mins: 15, scale: 1.8 },
  { label: '+30', mins: 30, scale: 2.5 },
]

interface Props {
  eventLat?: number
  eventLon?: number
  riskLevel?: string
  propagationTick: PropagationTick | null
  pipeline?: PipelineResult | null
  activeEvents?: PlannedEvent[]
  selectedEvent?: PlannedEvent | null
  onEventSelect?: (ev: PlannedEvent | null) => void
  assignments?: any[]
  barricades?: any[]
  liveFleetLocations?: Record<string, any>
  fleetRoute?: [number, number][] | null
}

export default function MapplsMap({
  eventLat,
  eventLon,
  riskLevel,
  propagationTick,
  pipeline,
  activeEvents,
  selectedEvent,
  onEventSelect,
  assignments,
  barricades,
  liveFleetLocations,
  fleetRoute,
}: Props) {
  const { mapRef, map, isLoaded, error, flyTo, addMarker, removeLayer } = useMapplsMap()

  const [forecastIdx, setForecastIdx] = useState(0)
  const forecast = FORECAST_STEPS[forecastIdx]
  const eventMarkersRef = useRef<any[]>([])
  const dispatchOverlaysRef = useRef<any[]>([])

  // Inject stylesheet for animations
  useEffect(() => {
    const styleId = 'mappls-custom-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.innerHTML = `
        @keyframes marker-pulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @keyframes fleet-pulse {
          0%, 100% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.12); opacity: 1; }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  // Register click handler on window for the markers to access
  useEffect(() => {
    if (!onEventSelect) return
    ;(window as any).handleEventClick = (eventId: string) => {
      if (selectedEvent && selectedEvent.id === eventId) {
        onEventSelect(selectedEvent)
      } else if (activeEvents) {
        const found = activeEvents.find((e) => e.id === eventId)
        if (found) onEventSelect(found)
      }
    }
    return () => {
      delete (window as any).handleEventClick
    }
  }, [selectedEvent, activeEvents, onEventSelect])

  // Render active event markers at all times
  useEffect(() => {
    const eventsToRender = activeEvents || (selectedEvent ? [selectedEvent] : [])
    if (!isLoaded || !map || eventsToRender.length === 0) return

    // Clear old active event markers
    eventMarkersRef.current.forEach(removeLayer)
    eventMarkersRef.current = []

    eventsToRender.forEach((ev) => {
      if (!ev.lat || !ev.lon) return

      const isRecovered = ev.status === 'resolved' || ev.status === 'closed'
      const isMissionAccomplished = assignments?.some((a) => a.status === 'completed')
      const isSelected = selectedEvent?.id === ev.id
      const evColor = isMissionAccomplished ? '#10b981' : isRecovered ? '#6b7280' : getEventColor(ev)
      const categoryIcon = getCategoryIconSvg(ev.category || '')

      const size = isSelected ? 34 : 26
      const opacity = isSelected ? '1.0' : isRecovered ? '0.6' : '0.85'
      const glow =
        isSelected && !isRecovered
          ? `box-shadow: 0 0 20px 4px ${evColor}; border: 2.5px solid white;`
          : `box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2px solid white;`
      const scale = isSelected ? 'transform: scale(1.1);' : ''
      const zIndex = isSelected ? '50' : '10'
      const pingSize = size + 12
      const pingOpacity = isSelected ? 0.35 : 0.2
      const pingRing = isRecovered
        ? ''
        : `<div class="animate-ping" style="position: absolute; width: ${pingSize}px; height: ${pingSize}px; border-radius: 50%; background-color: ${evColor}; opacity: ${pingOpacity}; pointer-events: none;"></div>`

      const markerHtml = `
        <div onclick="window.handleEventClick('${ev.id}')" 
             style="
               position: relative; 
               display: flex; 
               align-items: center; 
               justify-content: center; 
               cursor: pointer; 
               pointer-events: auto;
               z-index: ${zIndex};
               ${scale}
             ">
          ${pingRing}
          <div style="
            width: ${size}px; 
            height: ${size}px; 
            border-radius: 50%; 
            background-color: ${evColor}; 
            ${glow}
            opacity: ${opacity};
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white;
            transition: all 0.2s ease-in-out;
          ">
            ${categoryIcon}
          </div>
        </div>
      `

      const marker = addMarker(ev.lat, ev.lon, { html: markerHtml })
      if (marker) eventMarkersRef.current.push(marker)
    })

    return () => {
      eventMarkersRef.current.forEach(removeLayer)
      eventMarkersRef.current = []
    }
  }, [isLoaded, map, activeEvents, selectedEvent, addMarker, removeLayer])

  // Fly to event location
  useEffect(() => {
    if (isLoaded && eventLat && eventLon) {
      flyTo(eventLat, eventLon, 14)
    }
  }, [isLoaded, eventLat, eventLon, flyTo])

  // Render impact radius using native Mapbox layers for smooth blur and no duplication
  useEffect(() => {
    if (!isLoaded || !map || !eventLat || !eventLon) return

    const sourceId = 'impact-source'
    const isRecovered = selectedEvent?.status === 'resolved' || selectedEvent?.status === 'closed'
    const isMissionAccomplished = assignments?.some((a) => a.status === 'completed')

    const activeNodesArray = propagationTick?.activeNodes
      ? Object.values(propagationTick.activeNodes)
      : []
    const maxNodeIntensity = activeNodesArray.length
      ? Math.max(...activeNodesArray.map((n: any) => n.intensity))
      : 0

    const currentSeverity = isRecovered
      ? 0
      : propagationTick?.eventId === selectedEvent?.id
        ? maxNodeIntensity
        : (selectedEvent?.severity_score ?? pipeline?.prediction?.severity_score ?? 0.5)

    const impactColor = isMissionAccomplished ? '#10b981' : isRecovered ? '#6b7280' : getScoreColor(currentSeverity)

    if (isRecovered && !isMissionAccomplished) {
      if (map.getSource(sourceId)) {
        ;(map.getSource(sourceId) as any).setData({ type: 'FeatureCollection', features: [] })
      }
    } else {
      const severityMultiplier = 0.5 + currentSeverity * 1.5

      const pointData = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Point', coordinates: [eventLon, eventLat] } },
        ],
      }

      // Dynamically calculate radius at zoom 11 based on forecast and severity
      const rInner = 15 * forecast.scale * severityMultiplier
      const rMiddle = 35 * forecast.scale * severityMultiplier
      const rOuter = 75 * forecast.scale * severityMultiplier

      if (map.getSource(sourceId)) {
        ;(map.getSource(sourceId) as any).setData(pointData)

        // Update radius and color
        if (map.getLayer('impact-inner')) {
          map.setPaintProperty('impact-inner', 'circle-radius', [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            11,
            rInner,
            20,
            rInner * 512,
          ])
          map.setPaintProperty('impact-middle', 'circle-radius', [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            11,
            rMiddle,
            20,
            rMiddle * 512,
          ])
          map.setPaintProperty('impact-outer', 'circle-radius', [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            11,
            rOuter,
            20,
            rOuter * 512,
          ])

          map.setPaintProperty('impact-inner', 'circle-color', impactColor)
          map.setPaintProperty('impact-middle', 'circle-color', impactColor)
          map.setPaintProperty('impact-outer', 'circle-color', impactColor)
        }
      } else {
        map.addSource(sourceId, { type: 'geojson', data: pointData })

        // Outer blurred ring
        map.addLayer({
          id: 'impact-outer',
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              11,
              rOuter,
              20,
              rOuter * 512,
            ],
            'circle-color': impactColor,
            'circle-opacity': 0.15,
            'circle-blur': 1.5,
          },
        })

        // Middle blurred ring
        map.addLayer({
          id: 'impact-middle',
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              11,
              rMiddle,
              20,
              rMiddle * 512,
            ],
            'circle-color': impactColor,
            'circle-opacity': 0.25,
            'circle-blur': 1,
          },
        })

        // Inner glowing core
        map.addLayer({
          id: 'impact-inner',
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': [
              'interpolate',
              ['exponential', 2],
              ['zoom'],
              11,
              rInner,
              20,
              rInner * 512,
            ],
            'circle-color': impactColor,
            'circle-opacity': 0.4,
            'circle-blur': 0.5,
          },
        })
      }
    }

    // Clear old HTML markers
    dispatchOverlaysRef.current.forEach(removeLayer)
    dispatchOverlaysRef.current = []

    // Render Fleet dispatches (live or planned)
    if (assignments && assignments.length > 0) {
      assignments.forEach((assignment, i) => {
        let lat = eventLat + (((i * 0.618) % 1) - 0.5) * 0.01
        let lon = eventLon + (((i * 0.382) % 1) - 0.5) * 0.01

        const match = pipeline?.fleet_plan?.deployments?.find(
          (d) =>
            d.junctionName.toLowerCase().replace(/\s+/g, '') ===
            assignment.junction_name.toLowerCase().replace(/\s+/g, ''),
        )

        if (liveFleetLocations && liveFleetLocations[assignment.user_id]) {
          lat = liveFleetLocations[assignment.user_id].lat
          lon = liveFleetLocations[assignment.user_id].lon
        } else if (match && match.lat && match.lon) {
          lat = match.lat
          lon = match.lon
        }

        const depMarker = addMarker(lat, lon, {
          html: getFleetMarkerHtml(assignment.status),
        })
        if (depMarker) dispatchOverlaysRef.current.push(depMarker)
      })
    } else if (pipeline?.fleet_plan?.deployments) {
      pipeline.fleet_plan.deployments.forEach((d, i) => {
        const lat = d.lat || eventLat + (((i * 0.618) % 1) - 0.5) * 0.01
        const lon = d.lon || eventLon + (((i * 0.382) % 1) - 0.5) * 0.01
        const depMarker = addMarker(lat, lon, {
          html: getFleetMarkerHtml('pending'),
        })
        if (depMarker) dispatchOverlaysRef.current.push(depMarker)
      })
    }

    // Render Barricade layouts (live or proposed)
    if (barricades && barricades.length > 0) {
      barricades.forEach((barricade) => {
        if (barricade.lat && barricade.lon) {
          const barMarker = addMarker(barricade.lat, barricade.lon, {
            html: getBarricadeMarkerHtml(barricade.status),
          })
          if (barMarker) dispatchOverlaysRef.current.push(barMarker)
        }
      })
    } else if (pipeline?.barricade_plan?.barricades) {
      pipeline.barricade_plan.barricades.forEach((barricade) => {
        if (barricade.lat && barricade.lon) {
          const barMarker = addMarker(barricade.lat, barricade.lon, {
            html: getBarricadeMarkerHtml('recommended'),
          })
          if (barMarker) dispatchOverlaysRef.current.push(barMarker)
        }
      })
    }

    return () => {
      // Clean up DOM markers
      dispatchOverlaysRef.current.forEach(removeLayer)
      dispatchOverlaysRef.current = []
    }
  }, [
    isLoaded,
    map,
    eventLat,
    eventLon,
    pipeline,
    assignments,
    barricades,
    liveFleetLocations,
    addMarker,
    removeLayer,
  ])

  // Cleanup Mapbox impact layers on unmount
  useEffect(() => {
    return () => {
      if (map) {
        try {
          if (map.getLayer('impact-inner')) map.removeLayer('impact-inner')
          if (map.getLayer('impact-middle')) map.removeLayer('impact-middle')
          if (map.getLayer('impact-outer')) map.removeLayer('impact-outer')
          if (map.getSource('impact-source')) map.removeSource('impact-source')
        } catch {
          // Ignore
        }
      }
    }
  }, [map])

  // Render diversion route polylines from the event epicenter to each barricade/diversion point
  useEffect(() => {
    if (!isLoaded || !map || !eventLat || !eventLon) return

    const sourceId = 'diversion-routes-source'
    const lineLayerId = 'diversion-routes-line'
    const casingLayerId = 'diversion-routes-casing'

    const removeDiversionLayers = () => {
      try {
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId)
        if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch {
        // Ignore — map may be tearing down
      }
    }

    const barricades = pipeline?.barricade_plan?.barricades ?? []
    if (barricades.length === 0) {
      removeDiversionLayers()
      return
    }

    let cancelled = false

    const drawRoutes = async () => {
      const routes = await Promise.all(
        barricades.map((b) => fetchRoute([eventLat, eventLon], [b.lat, b.lon])),
      )
      if (cancelled || !map) return

      const features = routes
        .map((points, i) => {
          if (!points || points.length < 2) return null
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              // GeoJSON expects [lon, lat]; fetchRoute returns [lat, lon]
              coordinates: points.map(([lat, lon]) => [lon, lat]),
            },
            properties: { type: barricades[i].type },
          }
        })
        .filter(Boolean)

      const geojsonData = { type: 'FeatureCollection', features }

      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData(geojsonData)
      } else {
        map.addSource(sourceId, { type: 'geojson', data: geojsonData })

        // Dark casing underneath for contrast against the dark basemap
        map.addLayer({
          id: casingLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0b1220',
            'line-width': 6,
            'line-opacity': 0.55,
          },
        })

        // Dashed route line: red for hard closures, blue for diversion signs
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['match', ['get', 'type'], 'hard_closure', '#ef4444', '#3b82f6'],
            'line-width': 3,
            'line-opacity': 0.85,
            'line-dasharray': [2, 1.5],
          },
        })
      }
    }

    drawRoutes()

    return () => {
      cancelled = true
      removeDiversionLayers()
    }
  }, [isLoaded, map, eventLat, eventLon, pipeline])

  // Render fleet route polyline
  useEffect(() => {
    if (!isLoaded || !map) return

    const sourceId = 'fleet-route-source'
    const lineLayerId = 'fleet-route-line'
    const casingLayerId = 'fleet-route-casing'

    const removeFleetLayers = () => {
      try {
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId)
        if (map.getLayer(casingLayerId)) map.removeLayer(casingLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch {
        // Ignore
      }
    }

    if (!fleetRoute || fleetRoute.length < 2) {
      removeFleetLayers()
      return
    }

    const geojsonData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            // GeoJSON expects [lon, lat]; fetchRoute returns [lat, lon]
            coordinates: fleetRoute.map(([lat, lon]) => [lon, lat]),
          },
          properties: {},
        },
      ],
    }

    if (map.getSource(sourceId)) {
      ;(map.getSource(sourceId) as any).setData(geojsonData)
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojsonData })

      // Dark casing underneath
      map.addLayer({
        id: casingLayerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#000000',
          'line-width': 7,
          'line-opacity': 0.6,
        },
      })

      // Highlighted route line (Uber style)
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#3b82f6', // Bright blue
          'line-width': 4,
          'line-opacity': 0.9,
        },
      })
    }

    return () => {
      removeFleetLayers()
    }
  }, [isLoaded, map, fleetRoute])

  const prevNodesRef = useRef<Record<string, { intensity: number; lat: number; lon: number }>>({})
  const currentNodesRef = useRef<Record<string, { intensity: number; lat: number; lon: number }>>(
    {},
  )
  const transitionStartRef = useRef<number>(0)
  const currentTickRef = useRef<PropagationTick | null>(null)

  useEffect(() => {
    if (!propagationTick) return
    if (propagationTick.tick !== (currentTickRef.current as any)?.tick) {
      prevNodesRef.current = currentNodesRef.current
      currentNodesRef.current = propagationTick.activeNodes
      transitionStartRef.current = Date.now()
      currentTickRef.current = propagationTick as any
    }
  }, [propagationTick])

  // Render propagation tick overlays (Heatmap with gaussian blur & animations) using native Mapbox Heatmap Layer for smooth blending
  useEffect(() => {
    if (!isLoaded || !map) return

    const isRecovered = selectedEvent?.status === 'resolved' || selectedEvent?.status === 'closed'

    const sourceId = 'propagation-source'
    const layerId = 'propagation-heatmap'

    if (!propagationTick || isRecovered) {
      if (map.getSource(sourceId)) {
        ;(map.getSource(sourceId) as any).setData({ type: 'FeatureCollection', features: [] })
      }
      return
    }

    const severityScore = pipeline?.prediction?.severity_score ?? 0.5
    const radiusMultiplier = 0.5 + severityScore * 1.5

    // Create Source/Layer if doesn't exist
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        maxzoom: 18,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 1, 18, 3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(16, 185, 129, 0)',
            0.3,
            'rgba(16, 185, 129, 0.6)',
            0.6,
            'rgba(245, 158, 11, 0.8)',
            1,
            'rgba(239, 68, 68, 1)',
          ],
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,
            20 * radiusMultiplier,
            18,
            80 * radiusMultiplier,
          ],
          'heatmap-opacity': 0.8,
        },
      })
    } else if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'heatmap-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        11,
        20 * radiusMultiplier,
        18,
        80 * radiusMultiplier,
      ])
    }

    let animationFrameId: number

    const renderLoop = () => {
      const now = Date.now()
      const elapsed = now - transitionStartRef.current
      const progress = Math.min(1, elapsed / 30000) // 30s transition

      const prevNodes = prevNodesRef.current
      const currentNodes = currentNodesRef.current

      const allKeys = new Set([...Object.keys(prevNodes), ...Object.keys(currentNodes)])
      const features: any[] = []

      allKeys.forEach((key) => {
        const prev = prevNodes[key]
        const curr = currentNodes[key]

        const startIntensity = prev ? prev.intensity : 0
        const endIntensity = curr ? curr.intensity : 0
        const currentIntensity = startIntensity + (endIntensity - startIntensity) * progress

        const lat = curr?.lat || prev?.lat
        const lon = curr?.lon || prev?.lon

        if (lat && lon && currentIntensity > 0.01) {
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lon, lat] },
            properties: { intensity: currentIntensity },
          })
        }
      })

      const geojsonData = { type: 'FeatureCollection', features }
      if (map.getSource(sourceId)) {
        ;(map.getSource(sourceId) as any).setData(geojsonData)
      }

      animationFrameId = requestAnimationFrame(renderLoop)
    }

    animationFrameId = requestAnimationFrame(renderLoop)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [isLoaded, map, propagationTick, selectedEvent?.status, pipeline])

  // Heatmap of all events when none is selected
  useEffect(() => {
    if (!isLoaded || !map) return

    const sourceId = 'all-events-source'
    const layerId = 'all-events-heatmap'

    // Only show all events heatmap when no specific event is selected
    // Disable default all-events density heatmap layer to prevent visual clutter
    const features: any[] = []

    const geojsonData = { type: 'FeatureCollection', features }

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(geojsonData)
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojsonData })

      // We use a heatmap layer where weight is driven by severity_score.
      // This causes both the color (via density) and the apparent radius to scale with severity.
      map.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        maxzoom: 18,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'severity_score'], 0, 0.2, 1, 2],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 1, 18, 3],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(16, 185, 129, 0)',
            0.3,
            'rgba(16, 185, 129, 0.6)',
            0.6,
            'rgba(245, 158, 11, 0.8)',
            1,
            'rgba(239, 68, 68, 1)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 25, 18, 80],
          'heatmap-opacity': 0.8,
        },
      })

      // Add a secondary circle layer to ensure sharp centers with specific colors/radii based directly on severity_score
      map.addLayer({
        id: layerId + '-points',
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10,
            ['*', 5, ['+', 0.5, ['get', 'severity_score']]],
            18,
            ['*', 20, ['+', 0.5, ['get', 'severity_score']]],
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'severity_score'],
            0,
            '#10b981',
            0.4,
            '#f59e0b',
            0.7,
            '#f97316',
            1,
            '#ef4444',
          ],
          'circle-blur': 0.5,
          'circle-opacity': 0.9,
        },
      })
    }
  }, [isLoaded, map, activeEvents, eventLat])

  // Cleanup Mapbox heatmap layers on unmount
  useEffect(() => {
    return () => {
      if (map) {
        try {
          if (map.getLayer('propagation-heatmap')) map.removeLayer('propagation-heatmap')
          if (map.getSource('propagation-source')) map.removeSource('propagation-source')
          if (map.getLayer('all-events-heatmap-points'))
            map.removeLayer('all-events-heatmap-points')
          if (map.getLayer('all-events-heatmap')) map.removeLayer('all-events-heatmap')
          if (map.getSource('all-events-source')) map.removeSource('all-events-source')
        } catch {
          // Ignore errors on unmount
        }
      }
    }
  }, [map])

  return (
    <div className="relative h-full w-full">
      {/* Map container */}
      <div
        ref={mapRef as React.RefObject<HTMLDivElement>}
        className="mappls-map-container h-full w-full"
      />

      {/* Loading state */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-card">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          </div>
          <div className="text-center">
            <p className="font-mono text-sm font-semibold tracking-wider text-foreground">
              INITIALIZING MAP
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Loading MapmyIndia SDK...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
          <Map size={32} className="text-red" />
          <p className="text-sm text-red">{error}</p>
          <p className="text-xs text-muted-foreground">
            Check your MapmyIndia API key and network connection
          </p>
        </div>
      )}

      {/* Map overlay info */}
      {isLoaded && (
        <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2.5">
          <span className="rounded border border-border bg-muted px-3 py-1.5 font-mono text-[13px] font-bold tracking-[3px] text-foreground">
            BENGALURU
          </span>
          {riskLevel && (
            <span
              className={`rounded px-3 py-1.5 font-mono text-[11px] font-bold tracking-[1.5px] ${
                riskLevel === 'low'
                  ? 'border border-green/30 bg-green/15 text-green'
                  : riskLevel === 'yellow'
                    ? 'border border-yellow/30 bg-yellow/15 text-yellow'
                    : riskLevel === 'orange'
                      ? 'border border-orange/30 bg-orange/15 text-orange'
                      : riskLevel === 'critical'
                        ? 'border border-critical/30 bg-critical/15 text-critical animate-pulse'
                        : 'border border-red/30 bg-red/15 text-red'
              }`}
            >
              {riskLevel.toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Forecast slider */}
      {isLoaded && eventLat && pipeline && (
        <div className="absolute bottom-5 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-muted/92 px-3 py-1.5 backdrop-blur-md">
          {FORECAST_STEPS.map((step, i) => (
            <button
              key={step.label}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all duration-200 ${
                i === forecastIdx
                  ? 'border border-primary bg-primary/15 text-primary'
                  : 'border border-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground'
              }`}
              onClick={() => setForecastIdx(i)}
            >
              {step.label}
              {step.mins > 0 && <span className="text-[8px] tracking-wider opacity-70">MIN</span>}
            </button>
          ))}
          {/* Progress bar */}
          <div className="absolute right-3 bottom-1 left-3 h-0.5 rounded-full bg-border-default">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{
                width: `${(forecastIdx / (FORECAST_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
