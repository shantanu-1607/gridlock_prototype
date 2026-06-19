import { Loader2, Map } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import { useMapplsMap } from '../../hooks/useMapplsMap'
import type { PipelineResult, PropagationTick } from '../../types'

/* eslint-disable @typescript-eslint/no-explicit-any */

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  critical: '#dc2626',
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
}

export default function MapplsMap({
  eventLat,
  eventLon,
  riskLevel,
  propagationTick,
  pipeline,
}: Props) {
  const { mapRef, map, isLoaded, error, flyTo, addMarker, removeLayer } = useMapplsMap()

  const [forecastIdx, setForecastIdx] = useState(0)
  const forecast = FORECAST_STEPS[forecastIdx]
  const overlaysRef = useRef<any[]>([])

  const color = RISK_COLORS[riskLevel || 'low'] || '#6b7280'

  // Fly to event location
  useEffect(() => {
    if (isLoaded && eventLat && eventLon) {
      flyTo(eventLat, eventLon, 14)
    }
  }, [isLoaded, eventLat, eventLon, flyTo])

  // Render impact radius using native Mapbox layers for smooth blur and no duplication
  useEffect(() => {
    if (!isLoaded || !map || !eventLat || !eventLon) return

    const severityScore = pipeline?.prediction?.severity_score ?? 0.5
    const severityMultiplier = 0.5 + severityScore * 1.5

    const sourceId = 'impact-source'
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
      map.getSource(sourceId).setData(pointData)

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

        map.setPaintProperty('impact-inner', 'circle-color', color)
        map.setPaintProperty('impact-middle', 'circle-color', color)
        map.setPaintProperty('impact-outer', 'circle-color', color)
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
          'circle-color': color,
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
          'circle-color': color,
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
          'circle-color': color,
          'circle-opacity': 0.4,
          'circle-blur': 0.5,
        },
      })
    }

    // Clear old HTML markers
    overlaysRef.current.forEach(removeLayer)
    overlaysRef.current = []

    // Event central marker with CSS animation
    const markerHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <div class="animate-ping" style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background-color: ${color}; opacity: 0.4;"></div>
        <div style="width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; box-shadow: 0 0 15px 2px ${color}; border: 2px solid white;"></div>
      </div>
    `
    const marker = addMarker(eventLat, eventLon, { html: markerHtml })
    if (marker) overlaysRef.current.push(marker)

    // Deployment markers as DOM elements (so they don't use the buggy MapmyIndia Circle)
    if (pipeline?.deployment_plan?.recommendations) {
      pipeline.deployment_plan.recommendations.forEach((_r, i) => {
        const lat = eventLat + (((i * 0.618) % 1) - 0.5) * 0.01
        const lon = eventLon + (((i * 0.382) % 1) - 0.5) * 0.01
        const depMarker = addMarker(lat, lon, {
          html: `<div style="width: 14px; height: 14px; border-radius: 50%; background-color: #3b82f6; border: 2px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>`,
        })
        if (depMarker) overlaysRef.current.push(depMarker)
      })
    }

    return () => {
      // Clean up DOM markers
      overlaysRef.current.forEach(removeLayer)
      overlaysRef.current = []
    }
  }, [isLoaded, map, eventLat, eventLon, color, forecast.scale, pipeline, addMarker, removeLayer])

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

  // Render propagation tick overlays (Heatmap with gaussian blur & animations) using native Mapbox Heatmap Layer for smooth blending
  useEffect(() => {
    if (!isLoaded || !map || !propagationTick) return

    const sourceId = 'propagation-source'
    const layerId = 'propagation-heatmap'

    const severityScore = pipeline?.prediction?.severity_score ?? 0.5
    const radiusMultiplier = 0.5 + severityScore * 1.5

    // Create GeoJSON from active nodes
    const features = Object.entries(propagationTick.activeNodes)
      .filter(([, node]) => node.lat && node.lon)
      .map(([, node]) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [node.lon, node.lat] },
        properties: { intensity: node.intensity },
      }))

    const geojsonData = { type: 'FeatureCollection', features }

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(geojsonData)

      // Update radius dynamically if severity changes
      if (map.getLayer(layerId)) {
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
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojsonData })

      map.addLayer({
        id: layerId,
        type: 'heatmap',
        source: sourceId,
        maxzoom: 18,
        paint: {
          // Increase weight as intensity increases
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
          // Increase intensity based on zoom
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 1, 18, 3],
          // Color ramp: transparent -> green -> yellow -> red
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
          // Radius scales with zoom and severity
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            11,
            20 * radiusMultiplier,
            18,
            80 * radiusMultiplier,
          ],
          // Smooth opacity
          'heatmap-opacity': 0.8,
        },
      })
    }
  }, [isLoaded, map, propagationTick, pipeline])

  // Cleanup Mapbox heatmap layers on unmount
  useEffect(() => {
    return () => {
      if (map) {
        try {
          if (map.getLayer('propagation-heatmap')) map.removeLayer('propagation-heatmap')
          if (map.getSource('propagation-source')) map.removeSource('propagation-source')
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
