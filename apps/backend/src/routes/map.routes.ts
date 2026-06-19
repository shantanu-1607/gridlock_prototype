import { Request, Response, Router } from 'express'

import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

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

export default router
