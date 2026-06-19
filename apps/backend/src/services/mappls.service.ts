const MAPPLS_KEY = process.env.MAPPLS_API_KEY

export interface DistanceMatrixResult {
  durations: number[][] // seconds, origins x destinations
  distances: number[][] // meters, origins x destinations
}

export async function getDistanceMatrix(
  origins: { lat: number; lon: number }[],
  destinations: { lat: number; lon: number }[],
): Promise<DistanceMatrixResult | null> {
  if (!MAPPLS_KEY) {
    console.warn(
      '[MapplsService] MAPPLS_API_KEY is not configured. Falling back to aerial distance.',
    )
    return null
  }
  if (origins.length === 0 || destinations.length === 0) {
    console.log('[MapplsService] No origins or destinations provided for distance matrix.')
    return null
  }

  // Mappls format: lon,lat;lon,lat;...
  const originStr = origins.map((o) => `${o.lon},${o.lat}`).join(';')
  const destStr = destinations.map((d) => `${d.lon},${d.lat}`).join(';')
  const sources = origins.map((_, i) => i).join(';')
  const targets = destinations.map((_, i) => origins.length + i).join(';')

  const url = `https://route.mappls.com/route/dm/distance_matrix/driving/${originStr};${destStr}?sources=${sources}&destinations=${targets}&access_token=${MAPPLS_KEY}`

  try {
    console.log(
      `[MapplsService] Fetching distance matrix for ${origins.length} origins and ${destinations.length} destinations...`,
    )
    const res = await fetch(url)
    if (!res.ok) {
      console.warn(`[MapplsService] API call failed with status ${res.status}`)
      return null
    }

    const data = await res.json()
    console.log(`[MapplsService] Distance matrix fetched successfully.`)
    return {
      durations: data.results?.durations || [],
      distances: data.results?.distances || [],
    }
  } catch (error) {
    console.warn('[MapplsService] API call failed:', error)
    return null
  }
}
