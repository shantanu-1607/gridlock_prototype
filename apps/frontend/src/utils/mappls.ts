/* eslint-disable no-console */
import { fetchWithAuth } from './api'

export interface MapplsSuggestion {
  eLoc: string
  placeName: string
  placeAddress: string
  latitude: number
  longitude: number
  type: string
}

export async function autosuggest(query: string): Promise<MapplsSuggestion[]> {
  if (query.length < 3) return []

  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    const res = await fetchWithAuth(
      `${API_BASE}/api/map/autosuggest?query=${encodeURIComponent(query)}`,
    )

    if (res.ok) {
      const data = await res.json()
      return data.suggestedLocations || []
    }

    return []
  } catch (err) {
    console.error('Failed to fetch autosuggest from backend:', err)
    return []
  }
}

// Fetches a road route between two points as an array of [lat, lon] pairs.
// Falls back to a straight line (handled server-side) and returns null on error.
export async function fetchRoute(
  from: [number, number], // [lat, lon]
  to: [number, number], // [lat, lon]
): Promise<[number, number][] | null> {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    const res = await fetchWithAuth(
      `${API_BASE}/api/map/route?from=${from[0]},${from[1]}&to=${to[0]},${to[1]}`,
    )

    if (res.ok) {
      const data = await res.json()
      return (data.geometry as [number, number][]) || null
    }

    return null
  } catch (err) {
    console.error('Failed to fetch route from backend:', err)
    return null
  }
}
