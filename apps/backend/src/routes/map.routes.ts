import { Request, Response, Router } from 'express'

import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

// Decodes a Google/OSRM-style encoded polyline into [lat, lon] pairs
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

router.get('/autosuggest', authenticateToken, async (req: Request, res: Response) => {
  const query = req.query.query as string
  if (!query || query.length < 3) {
    return res.json({ suggestedLocations: [] })
  }

  const MAPPLS_KEY = process.env.MAPMYINDIA_API

  if (MAPPLS_KEY) {
    try {
      const mapplsRes = await fetch(
        `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query)}&location=12.9716,77.5946&region=IND&bridge&pod=CITY`,
        { headers: { Authorization: `Bearer ${MAPPLS_KEY}` } },
      )

      if (mapplsRes.ok) {
        const data = await mapplsRes.json()
        return res.json({ suggestedLocations: data.suggestedLocations || [] })
      }

      // If 401 or 403, we fall back to Nominatim below
      console.warn(`Mappls API returned ${mapplsRes.status}. Falling back to Nominatim...`)
    } catch (err) {
      console.error('Failed to fetch Mappls autosuggest:', err)
      // Fallback below
    }
  }

  // Fallback to Nominatim OpenStreetMap
  try {
    const fallbackRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&viewbox=77.4,13.1,77.8,12.8&bounded=1`,
      { headers: { 'User-Agent': 'gridlock_prototype' } },
    )
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json()
      const mapped = fallbackData.map((item: any) => ({
        eLoc: item.place_id.toString(),
        placeName: item.display_name.split(',')[0],
        placeAddress: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type || 'POI',
      }))
      return res.json({ suggestedLocations: mapped })
    }
  } catch (err) {
    console.error('Nominatim fallback failed:', err)
  }

  return res.json({ suggestedLocations: [] })
})

router.get('/route', authenticateToken, async (req: Request, res: Response) => {
  const from = req.query.from as string // "lat,lon"
  const to = req.query.to as string // "lat,lon"
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to query params are required' })
  }

  const [fromLat, fromLon] = from.split(',').map(Number)
  const [toLat, toLon] = to.split(',').map(Number)
  if ([fromLat, fromLon, toLat, toLon].some((n) => Number.isNaN(n))) {
    return res.status(400).json({ error: 'invalid coordinates' })
  }

  // Straight line is the graceful fallback when no key / API failure
  const straightLine: [number, number][] = [
    [fromLat, fromLon],
    [toLat, toLon],
  ]

  const MAPPLS_KEY = process.env.MAPPLS_API_KEY || process.env.MAPMYINDIA_API

  if (MAPPLS_KEY) {
    try {
      const mapplsRes = await fetch(
        `https://route.mappls.com/route/direction/route_adv/driving/${fromLon},${fromLat};${toLon},${toLat}?geometries=polyline&overview=full&access_token=${MAPPLS_KEY}`,
      )

      if (mapplsRes.ok) {
        const data = await mapplsRes.json()
        const encoded = data.routes?.[0]?.geometry
        if (encoded) {
          return res.json({
            geometry: decodePolyline(encoded),
            distance: data.routes[0].distance ?? null,
            duration: data.routes[0].duration ?? null,
            fallback: false,
          })
        }
      }

      console.warn(
        `Mappls Route API returned ${mapplsRes.status}. Falling back to straight line...`,
      )
    } catch (err) {
      console.error('Failed to fetch Mappls route:', err)
    }
  }

  return res.json({ geometry: straightLine, distance: null, duration: null, fallback: true })
})

export default router
