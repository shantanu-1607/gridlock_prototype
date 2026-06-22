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

  // Check if MapmyIndia JS SDK is loaded
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = (window as any).mappls
  if (!m || !m.search) {
    console.warn('MapmyIndia SDK not loaded, falling back to backend')
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

  return new Promise((resolve) => {
    try {
      new m.search(
        query,
        {
          location: [12.9716, 77.5946],
          pod: 'CITY',
          tokenizeAddress: true,
        },
        (data: any) => {
          if (data && Array.isArray(data)) {
            const suggestions = data.map((item: any) => ({
              eLoc: item.eLoc || item.mapplsPin,
              placeName: item.placeName || item.poi || item.keyword,
              placeAddress: item.placeAddress || item.formattedAddress,
              latitude: item.latitude || item.lat,
              longitude: item.longitude || item.lng,
              type: item.type || 'POI',
            }))
            resolve(suggestions)
          } else {
            resolve([])
          }
        },
      )
    } catch (err) {
      console.error('Mappls search plugin error:', err)
      resolve([])
    }
  })
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
