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
