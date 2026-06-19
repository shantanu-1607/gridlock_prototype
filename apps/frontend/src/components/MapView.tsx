import L from 'leaflet'
import { useEffect, useState } from 'react'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'

import type { PipelineResult, PropagationTick } from '../types'

// Fix Leaflet default icon issue with bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946]

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  critical: '#dc2626',
}

function PropagationOverlay({ tick }: { tick: PropagationTick | null }) {
  const map = useMap()

  useEffect(() => {
    if (!tick) return
    const circles: L.Circle[] = []

    Object.entries(tick.activeNodes).forEach(([_nodeId, node]) => {
      if (!node.lat || !node.lon) return
      const circle = L.circle([node.lat, node.lon], {
        radius: 200 + node.intensity * 800,
        fillColor: node.intensity > 0.7 ? '#ef4444' : node.intensity > 0.4 ? '#f59e0b' : '#10b981',
        fillOpacity: 0.3 + node.intensity * 0.4,
        color: 'transparent',
        className: 'propagation-pulse',
      }).addTo(map)
      circles.push(circle)
    })

    return () => circles.forEach((c) => c.remove())
  }, [tick, map])

  return null
}

function FlyToLocation({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    if (lat && lon) map.flyTo([lat, lon], 14, { duration: 1.5 })
  }, [lat, lon, map])
  return null
}

const FORECAST_STEPS = [
  { label: 'NOW', mins: 0, scale: 1.0 },
  { label: '+5', mins: 5, scale: 1.3 },
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

export default function MapView({
  eventLat,
  eventLon,
  riskLevel,
  propagationTick,
  pipeline,
}: Props) {
  const color = RISK_COLORS[riskLevel || 'low'] || '#6b7280'
  const [forecastIdx, setForecastIdx] = useState(0)
  const forecast = FORECAST_STEPS[forecastIdx]

  return (
    <div className="map-container">
      <MapContainer center={BANGALORE_CENTER} zoom={12} className="leaflet-map" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {eventLat && eventLon && (
          <>
            <FlyToLocation lat={eventLat} lon={eventLon} />
            <Marker position={[eventLat, eventLon]}>
              <Popup>
                <strong>Incident Location</strong>
                {pipeline && (
                  <div>
                    <div>Duration: {Math.round(pipeline.prediction.duration_mins)} min</div>
                    <div>Risk: {pipeline.queue_analysis.risk_level.toUpperCase()}</div>
                  </div>
                )}
              </Popup>
            </Marker>

            {/* Impact radius rings — scaled by forecast time step */}
            <Circle
              center={[eventLat, eventLon]}
              radius={500 * forecast.scale}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.25 / forecast.scale,
                weight: 2,
              }}
            />
            <Circle
              center={[eventLat, eventLon]}
              radius={1200 * forecast.scale}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '8 4',
              }}
            />
            <Circle
              center={[eventLat, eventLon]}
              radius={2500 * forecast.scale}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.05,
                weight: 1,
                dashArray: '4 8',
              }}
            />
          </>
        )}

        {/* Deployment markers */}
        {pipeline?.deployment_plan.recommendations.map((r, i) => (
          <Circle
            key={`deploy-${i}`}
            center={[
              (eventLat || BANGALORE_CENTER[0]) + (((i * 0.618) % 1) - 0.5) * 0.01,
              (eventLon || BANGALORE_CENTER[1]) + (((i * 0.382) % 1) - 0.5) * 0.01,
            ]}
            radius={150}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, weight: 2 }}
          >
            <Popup>
              <strong>{r.junction_name}</strong>
              <div>
                {r.officers} officers, {r.barricades} barricades
              </div>
            </Popup>
          </Circle>
        ))}

        <PropagationOverlay tick={propagationTick} />
      </MapContainer>

      {/* Map overlay info */}
      <div className="map-overlay-top">
        <span className="map-city">BENGALURU</span>
        {riskLevel && (
          <span className={`map-risk risk-${riskLevel}`}>{riskLevel.toUpperCase()}</span>
        )}
      </div>

      {/* Temporal forecast slider */}
      {eventLat && pipeline && (
        <div className="forecast-slider">
          {FORECAST_STEPS.map((step, i) => (
            <button
              key={step.label}
              className={`forecast-btn ${i === forecastIdx ? 'active' : ''}`}
              onClick={() => setForecastIdx(i)}
            >
              {step.label}
              {step.mins > 0 && <span className="forecast-min">MIN</span>}
            </button>
          ))}
          <div className="forecast-track">
            <div
              className="forecast-fill"
              style={{ width: `${(forecastIdx / (FORECAST_STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
