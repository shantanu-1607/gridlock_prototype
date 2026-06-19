# MapMyIndia (Mappls) API — GridLock Integration Plan

> Single source of truth for all MapMyIndia implementation work.
> Created: 2026-06-19 | Status: Ready to implement (API key pending)

---

## 1. API Credentials & Environment Setup

### Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_MAPPLS_API_KEY` | `apps/frontend/.env` | Frontend REST API key (exposed to browser) |
| `MAPPLS_API_KEY` | `apps/backend/.env` | Backend REST API key |
| `MAPPLS_CLIENT_ID` | `apps/backend/.env` | OAuth2 client ID (for server-side token generation) |
| `MAPPLS_CLIENT_SECRET` | `apps/backend/.env` | OAuth2 client secret |

### Base URLs

| Purpose | URL |
|---------|-----|
| REST API (maps) | `https://apis.mappls.com/advancedmaps/v1/{REST_KEY}/` |
| Route API (routing, distance) | `https://route.mappls.com/route/` |
| Atlas API (places, search, nearby) | `https://atlas.mappls.com/api/` |
| OAuth2 Token | `https://outpost.mappls.com/api/security/oauth/token` |
| JS SDK (vector maps) | `https://apis.mappls.com/advancedmaps/api/{REST_KEY}/map_sdk?layer=vector&v=3.0` |
| JS SDK (raster maps) | `https://apis.mappls.com/advancedmaps/api/{REST_KEY}/map_sdk?layer=raster&v=3.0` |

### Authentication

**Frontend (browser):** Use REST API key directly in URL path or query param. No OAuth needed.

**Backend (server-side):** Use OAuth2 client credentials for Atlas API calls:
```bash
curl -X POST https://outpost.mappls.com/api/security/oauth/token \
  -d "grant_type=client_credentials&client_id={ID}&client_secret={SECRET}"
# Returns: { "access_token": "...", "token_type": "bearer", "expires_in": 86400 }
```

### Docker Compose Changes

Add to `docker-compose.yml` under `backend.environment`:
```yaml
- MAPPLS_API_KEY=${MAPPLS_API_KEY}
- MAPPLS_CLIENT_ID=${MAPPLS_CLIENT_ID}
- MAPPLS_CLIENT_SECRET=${MAPPLS_CLIENT_SECRET}
```

Add to `docker-compose.yml` under `frontend.environment`:
```yaml
- VITE_MAPPLS_API_KEY=${VITE_MAPPLS_API_KEY}
```

---

## 2. All 20 Allocated APIs Mapped to GridLock Features

| # | API | Description | GridLock Feature | Priority |
|---|-----|-------------|-----------------|----------|
| 1 | Autosuggest API | Typeahead location search | Event form location search | P0 |
| 2 | Nearby API | Find POIs near a coordinate | Event Readiness Card | P2 |
| 3 | Text Search API | Full-text place search | Backup geocoding | - |
| 4 | Geocode API | Address to lat/lon | Address resolution | P0 |
| 5 | Vector Tiles SDK | Vector map tiles | Map tile source (alt) | P0 |
| 6 | Inter JS SDK Initialization API | SDK initialization | Required for JS SDK | P0 |
| 7 | Reverse Geocode API | Lat/lon to address | Map click to address | P2 |
| 8 | Raster Tiles SDK | Raster map tiles | Map tile source (dark theme) | P0 |
| 9 | POI Along the Route API | POIs along a path | Diversion context enrichment | P3 |
| 10 | Distance Matrix Non-Traffic | Baseline travel distances | Fallback distances | P1 |
| 11 | Terrain Tiles API | Elevation/terrain tiles | Not needed | - |
| 12 | Distance Matrix ETA API Traffic | Real-time travel times | Fleet dispatch ETAs | P1 |
| 13 | Route ADV API Non Traffic | Static routing | Fallback routing | P1 |
| 14 | Route ETA API Traffic | Real-time routing + ETA | Diversion polylines | P1 |
| 15 | Place Detail | Detailed POI info | Nearby card details | P2 |
| 16 | Vector Map JS SDK Initialization | Vector map init | Interactive vector map | P0 |
| 17 | Aerial Distance API | Straight-line distance | Quick distance checks | - |
| 18 | Places and Directions Web SDK | Combined places + routes SDK | All-in-one frontend SDK | P0 |
| 19 | eLoc Marker | Place markers by eLoc code | Map markers | - |
| 20 | List Styles API | Available map styles | Style selection (dark mode) | P0 |

---

## 3. P0 — Map Tile Swap

**Priority:** P0 (must have) | **Effort:** Low | **Demo impact:** High

### Current State
- **File:** `apps/frontend/src/components/MapView.tsx` (line 89)
- **Tile URL:** `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- **Stack:** Leaflet.js 1.9.4 + react-leaflet 4.2.1

### Option A: Raster Tiles (Minimal change)

Replace the TileLayer URL:
```tsx
// Before
<TileLayer
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
/>

// After
<TileLayer
  attribution='&copy; <a href="https://www.mappls.com">Mappls</a>'
  url={`https://apis.mappls.com/advancedmaps/v1/${import.meta.env.VITE_MAPPLS_API_KEY}/still_map_image/map/{z}/{x}/{y}?style=dark`}
/>
```

**Pros:** Minimal code change, keeps all react-leaflet overlays working.
**Cons:** Raster tiles may not have dark theme; need to verify available styles.

### Option B: Mappls JS SDK (Full swap)

1. Add SDK script to `apps/frontend/index.html`:
```html
<script src="https://apis.mappls.com/advancedmaps/api/{KEY}/map_sdk?layer=vector&v=3.0"></script>
```

2. Create `MapplsMap` component that wraps `mappls.Map()`:
```tsx
// Use mappls.Map() for the base map
// Keep react-leaflet Marker/Circle/Polyline for overlays via separate overlay layer
```

**Pros:** Full India-accurate vector maps, dark theme built-in, junction names visible.
**Cons:** More work, need to bridge Mappls map instance with react-leaflet overlays.

### Recommended: Option A first, Option B if time permits

### Fallback
```tsx
const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY
const TILE_URL = MAPPLS_KEY
  ? `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/still_map_image/map/{z}/{x}/{y}`
  : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
```

---

## 4. P0 — Autosuggest on Event Form

**Priority:** P0 (must have) | **Effort:** Low | **Demo impact:** High

### Current State
- **File:** `apps/frontend/src/components/PlanEventForm.tsx` (lines 148-187)
- Manual lat/lon number inputs
- No address search

### Implementation

#### New utility: `apps/frontend/src/utils/mappls.ts`

```typescript
const MAPPLS_KEY = import.meta.env.VITE_MAPPLS_API_KEY

export interface MapplsSuggestion {
  eLoc: string
  placeName: string
  placeAddress: string
  latitude: number
  longitude: number
  type: string
}

export async function autosuggest(query: string): Promise<MapplsSuggestion[]> {
  if (!MAPPLS_KEY || query.length < 3) return []

  const res = await fetch(
    `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query)}&location=12.9716,77.5946&region=IND&bridge&pod=CITY`,
    { headers: { Authorization: `Bearer ${MAPPLS_KEY}` } }
  )

  if (!res.ok) return []
  const data = await res.json()
  return data.suggestedLocations || []
}
```

#### Changes to PlanEventForm.tsx

Add above the Latitude/Longitude fields (line 153):
```tsx
<div className="form-group">
  <label>Search Location</label>
  <input
    type="text"
    placeholder="Type a place name, e.g. Chinnaswamy Stadium"
    value={searchQuery}
    onChange={handleSearchChange}
  />
  {suggestions.length > 0 && (
    <div className="autosuggest-dropdown">
      {suggestions.map((s) => (
        <div key={s.eLoc} className="autosuggest-item" onClick={() => handleSelectSuggestion(s)}>
          <strong>{s.placeName}</strong>
          <span>{s.placeAddress}</span>
        </div>
      ))}
    </div>
  )}
</div>
```

On suggestion select:
```typescript
const handleSelectSuggestion = (s: MapplsSuggestion) => {
  update('lat', s.latitude)
  update('lon', s.longitude)
  setSearchQuery(s.placeName)
  setSuggestions([])
}
```

### API Endpoint Details

```
GET https://atlas.mappls.com/api/places/search/json
Headers: Authorization: Bearer {API_KEY}
Query params:
  - query: search string (min 3 chars)
  - location: bias center (12.9716,77.5946 for Bangalore)
  - region: IND
  - pod: CITY (optional, scope results)
  - bridge: (optional, include bridge info)

Response:
{
  "suggestedLocations": [
    {
      "eLoc": "MMI000",
      "placeName": "M. Chinnaswamy Stadium",
      "placeAddress": "MG Road, Bangalore",
      "latitude": 12.9788,
      "longitude": 77.5996,
      "type": "POI"
    }
  ]
}
```

---

## 5. P1 — Distance Matrix for Fleet Dispatch

**Priority:** P1 (should have) | **Effort:** Medium | **Demo impact:** Very High

### Current State
- **File:** `apps/backend/src/services/recommendation.service.ts`
- `assignNearestFleet()` (line 100) uses `Math.hypot()` — aerial distance, not road distance
- `buildUserPrompt()` (line 220) says "Total Available: N personnel" — no travel times
- LLM hallucates `deploy_by_mins` values

### Implementation

#### New file: `apps/backend/src/services/mappls.service.ts`

```typescript
const MAPPLS_KEY = process.env.MAPPLS_API_KEY

interface DistanceMatrixResult {
  durations: number[][]  // seconds, origins x destinations
  distances: number[][]  // meters, origins x destinations
}

export async function getDistanceMatrix(
  origins: { lat: number; lon: number }[],
  destinations: { lat: number; lon: number }[]
): Promise<DistanceMatrixResult | null> {
  if (!MAPPLS_KEY) return null

  // Mappls format: lon,lat;lon,lat;...
  const originStr = origins.map(o => `${o.lon},${o.lat}`).join(';')
  const destStr = destinations.map(d => `${d.lon},${d.lat}`).join(';')
  const sources = origins.map((_, i) => i).join(';')
  const targets = destinations.map((_, i) => origins.length + i).join(';')

  const url = `https://route.mappls.com/route/dm/distance_matrix_eta/driving/${originStr};${destStr}?sources=${sources}&destinations=${targets}&access_token=${MAPPLS_KEY}`

  const res = await fetch(url)
  if (!res.ok) return null

  const data = await res.json()
  return {
    durations: data.results?.durations || [],
    distances: data.results?.distances || [],
  }
}
```

#### Changes to recommendation.service.ts

1. Before `callGroqDispatch()`, fetch travel times:
```typescript
import { getDistanceMatrix } from './mappls.service'

// In generateDispatchPlan(), before try/catch:
const candidateIds = [...new Set([
  ...context.forecast.t0_nodes,
  ...context.forecast.t15_nodes,
  ...context.forecast.t30_nodes,
])]
const candidateJunctions = candidateIds
  .map(id => graphService.junctions.get(id))
  .filter(Boolean)

const travelTimes = await getDistanceMatrix(
  context.availableFleet.map(f => ({ lat: f.current_lat, lon: f.current_lon })),
  candidateJunctions.map(j => ({ lat: j.lat, lon: j.lon }))
)
```

2. Update `buildUserPrompt()` to include travel times:
```typescript
AVAILABLE FLEET WITH TRAVEL TIMES:
${availableFleet.map((f, i) => {
  const etas = candidateJunctionNames.map((name, j) => {
    const mins = travelTimes ? Math.round(travelTimes.durations[i][j] / 60) : '?'
    return `${mins} min to ${name}`
  }).join(', ')
  return `- ${f.name} (${etas})`
}).join('\n')}
```

3. Update `assignNearestFleet()` to use real travel time when available:
```typescript
// Sort by travelTimes.durations[fleetIdx][junctionIdx] instead of Math.hypot
```

### API Endpoint Details

```
GET https://route.mappls.com/route/dm/distance_matrix_eta/driving/{coords}
  ?sources=0;1;2      (indices of origin coords)
  &destinations=3;4;5  (indices of destination coords)

Coords format: lon1,lat1;lon2,lat2;lon3,lat3;lon4,lat4;lon5,lat5
  (origins first, then destinations, all semicolon-separated)

Response:
{
  "results": {
    "durations": [[120, 450], [300, 180]],   // seconds, [origin][dest]
    "distances": [[2400, 8500], [5200, 3100]] // meters
  },
  "status": 200
}
```

### Fallback
If `MAPPLS_API_KEY` is not set or API call fails, fall back to existing `Math.hypot()` aerial distance calculation — no behavior change from current state.

---

## 6. P1 — Diversion Route Polylines

**Priority:** P1 (should have) | **Effort:** Medium | **Demo impact:** Very High

### Current State
- **File:** `apps/frontend/src/components/MapView.tsx`
- Gating recommendations are text-only in PipelinePanel
- No visual route lines on map
- Deployment markers are circles at approximate positions (lines 144-161)

### Implementation

#### Route fetching in `apps/frontend/src/utils/mappls.ts`

```typescript
export async function fetchRoute(
  from: [number, number],  // [lat, lon]
  to: [number, number]
): Promise<[number, number][] | null> {
  if (!MAPPLS_KEY) return null

  const url = `https://route.mappls.com/route/adv/driving/${from[1]},${from[0]};${to[1]},${to[0]}?geometries=polyline&overview=full&access_token=${MAPPLS_KEY}`

  const res = await fetch(url)
  if (!res.ok) return null

  const data = await res.json()
  const encoded = data.routes?.[0]?.geometry
  if (!encoded) return null

  return decodePolyline(encoded)
}

// Google polyline decoder
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0, lat = 0, lng = 0

  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lat += (result & 1) ? ~(result >> 1) : (result >> 1)

    shift = 0; result = 0
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5 } while (b >= 0x20)
    lng += (result & 1) ? ~(result >> 1) : (result >> 1)

    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}
```

#### Changes to MapView.tsx

Add `<Polyline>` for each diversion route:
```tsx
import { Polyline } from 'react-leaflet'

// Inside MapContainer, after deployment markers:
{diversionRoutes.map((route, i) => (
  <Polyline
    key={`diversion-${i}`}
    positions={route.points}
    pathOptions={{
      color: '#3b82f6',
      dashArray: '10 6',
      weight: 3,
      opacity: 0.8,
    }}
  />
))}
```

Fetch routes when pipeline changes:
```tsx
const [diversionRoutes, setDiversionRoutes] = useState<{points: [number,number][]}[]>([])

useEffect(() => {
  if (!pipeline?.gating_plan?.recommendations || !eventLat || !eventLon) return

  const fetchRoutes = async () => {
    const routes = await Promise.all(
      pipeline.gating_plan.recommendations.map(async (g) => {
        // Get junction coords from deployment markers or approximate
        const jLat = eventLat + (Math.random() - 0.5) * 0.02
        const jLon = eventLon + (Math.random() - 0.5) * 0.02
        const points = await fetchRoute([eventLat, eventLon], [jLat, jLon])
        return points ? { points } : null
      })
    )
    setDiversionRoutes(routes.filter(Boolean))
  }
  fetchRoutes()
}, [pipeline, eventLat, eventLon])
```

### API Endpoint Details

```
GET https://route.mappls.com/route/adv/driving/{startLon},{startLat};{endLon},{endLat}
  ?geometries=polyline
  &overview=full

Response:
{
  "routes": [{
    "geometry": "encoded_polyline_string",
    "duration": 480,      // seconds
    "distance": 3200,     // meters
    "legs": [{ ... }]
  }]
}
```

---

## 7. P2 — Nearby Search (Event Readiness Card)

**Priority:** P2 (nice to have) | **Effort:** Low | **Demo impact:** High (differentiator)

### Implementation

#### New utility in `apps/frontend/src/utils/mappls.ts`

```typescript
export interface NearbyPlace {
  placeName: string
  placeAddress: string
  distance: number  // meters
  latitude: number
  longitude: number
  keywords: string
}

export async function nearbySearch(
  lat: number,
  lon: number,
  keywords: string,
  radius: number = 1000
): Promise<NearbyPlace[]> {
  if (!MAPPLS_KEY) return []

  const url = `https://atlas.mappls.com/api/places/nearby/json?keywords=${encodeURIComponent(keywords)}&refLocation=${lat},${lon}&radius=${radius}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${MAPPLS_KEY}` },
  })

  if (!res.ok) return []
  const data = await res.json()
  return data.suggestedLocations || []
}
```

#### New component: `apps/frontend/src/components/NearbyCard.tsx`

```tsx
// Fetches nearby hospitals, police stations, parking on mount
// Displays as a compact card with 3 rows:
//   Hospital icon | Bowring Hospital | 1.2 km
//   Police icon   | Shivajinagar PS  | 0.8 km
//   Parking icon  | Kanteerava Ground | 0.5 km
```

#### Integration in PipelinePanel.tsx

Add after Resource Deployment section (line 93):
```tsx
{eventLat && eventLon && (
  <NearbyCard lat={eventLat} lon={eventLon} />
)}
```

### API Endpoint Details

```
GET https://atlas.mappls.com/api/places/nearby/json
Headers: Authorization: Bearer {API_KEY}
Query params:
  - keywords: "hospital" | "police station" | "parking"
  - refLocation: lat,lon
  - radius: meters (default 1000)

Response:
{
  "suggestedLocations": [
    {
      "placeName": "Bowring Hospital",
      "placeAddress": "Shivajinagar, Bangalore",
      "distance": "1.2 km",
      "latitude": 12.9821,
      "longitude": 77.6047
    }
  ]
}
```

---

## 8. P2 — Reverse Geocoding on Map Click

**Priority:** P2 (nice to have) | **Effort:** Low | **Demo impact:** Medium

### Implementation

#### New utility in `apps/frontend/src/utils/mappls.ts`

```typescript
export interface ReverseGeocodeResult {
  houseNumber: string
  houseName: string
  poi: string
  street: string
  subSubLocality: string
  subLocality: string
  locality: string
  city: string
  formatted_address: string
}

export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult | null> {
  if (!MAPPLS_KEY) return null

  // ⚠ TODO: Update to Atlas Reverse Geocode API once verified
  const url = `https://apis.mappls.com/advancedmaps/v1/${MAPPLS_KEY}/rev_geocode?lat=${lat}&lng=${lon}`
  const res = await fetch(url)
  if (!res.ok) return null

  const data = await res.json()
  return data.results?.[0] || null
}
```

#### Changes to MapView.tsx

```tsx
import { useMapEvents } from 'react-leaflet'

function MapClickHandler({ onLocationClick }: { onLocationClick?: (lat: number, lon: number, address: string) => void }) {
  useMapEvents({
    click: async (e) => {
      if (!onLocationClick) return
      const { lat, lng } = e.latlng
      const result = await reverseGeocode(lat, lng)
      const address = result?.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      onLocationClick(lat, lng, address)
    },
  })
  return null
}
```

Add prop to MapView:
```tsx
onLocationClick?: (lat: number, lon: number, address: string) => void
```

Wire in App.tsx to update PlanEventForm fields on map click.

### API Endpoint Details

```
GET https://apis.mappls.com/advancedmaps/v1/{KEY}/rev_geocode?lat={lat}&lng={lon}

Response:
{
  "responseCode": 200,
  "results": [{
    "houseNumber": "",
    "houseName": "",
    "poi": "M. Chinnaswamy Stadium",
    "street": "MG Road",
    "subLocality": "Shivajinagar",
    "locality": "Bangalore",
    "city": "Bangalore",
    "formatted_address": "MG Road, Shivajinagar, Bangalore 560001"
  }]
}
```

---

## 9. P3 — Stretch Goals (Document Only)

These are documented for reference but NOT planned for implementation:

### Live Traffic Tiles Overlay
- Add a toggle-able traffic layer using Mappls traffic tiles
- Compare simulated propagation vs live traffic → anomaly detection
- API: Raster Tiles SDK with traffic style

### Geofencing for Auto Fleet Status
- Create circular geofence around each dispatch junction (150m radius)
- Fleet member's browser location pings every 30s
- Auto-trigger `PATCH /fleet/tasks/:id` → status: `on_site` on geofence entry
- API: Geofencing API (not in allocated list — may need separate allocation)

### POI Along Route
- For diversion routes, find relevant stops (fuel, rest areas)
- API: POI Along the Route API

### Route Optimization for Patrols
- Multi-stop fleet assignments (TSP solver)
- API: Not in allocated list — would need Route Optimization API

---

## 10. New Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `apps/frontend/src/utils/mappls.ts` | Frontend Mappls API helper (autosuggest, nearby, reverse geocode, route fetch, polyline decode) | P0 |
| `apps/backend/src/services/mappls.service.ts` | Backend Mappls helper (OAuth2 token caching, distance matrix) | P1 |
| `apps/frontend/src/components/NearbyCard.tsx` | Event Readiness Card (hospitals, police, parking nearby) | P2 |

---

## 11. Existing Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `apps/frontend/.env` | Add `VITE_MAPPLS_API_KEY` | P0 |
| `apps/backend/.env` | Add `MAPPLS_API_KEY`, `MAPPLS_CLIENT_ID`, `MAPPLS_CLIENT_SECRET` | P1 |
| `docker-compose.yml` | Pass Mappls env vars to frontend + backend services | P0 |
| `apps/frontend/index.html` | Optional: add Mappls JS SDK `<script>` tag for vector maps | P0 |
| `apps/frontend/src/components/MapView.tsx` (line 89) | Swap tile URL, add Polyline for diversions, add click handler | P0/P1/P2 |
| `apps/frontend/src/components/PlanEventForm.tsx` (line 148) | Add autosuggest search input above lat/lon fields | P0 |
| `apps/frontend/src/components/PipelinePanel.tsx` (line 93) | Add NearbyCard after Resource Deployment section | P2 |
| `apps/frontend/src/types/index.ts` | Add `NearbyResult`, `MapplsSuggestion` types | P0 |
| `apps/frontend/src/App.tsx` | Pass `onLocationClick` callback from MapView to PlanEventForm | P2 |
| `apps/backend/src/services/recommendation.service.ts` (line 220, 278) | Add distance matrix call, update LLM prompt with ETAs | P1 |

---

## 12. Execution Order

| Step | Task | Files | Priority |
|------|------|-------|----------|
| 1 | Set up env vars, create `mappls.ts` utility | `.env`, `mappls.ts` | P0 |
| 2 | Swap map tiles in MapView | `MapView.tsx`, `index.html` | P0 |
| 3 | Add autosuggest to PlanEventForm | `PlanEventForm.tsx`, `mappls.ts` | P0 |
| 4 | Create `mappls.service.ts`, add distance matrix to fleet dispatch | `mappls.service.ts`, `recommendation.service.ts` | P1 |
| 5 | Add diversion route polylines to MapView | `MapView.tsx`, `mappls.ts` | P1 |
| 6 | Create NearbyCard, add to PipelinePanel | `NearbyCard.tsx`, `PipelinePanel.tsx` | P2 |
| 7 | Add reverse geocoding click handler | `MapView.tsx`, `mappls.ts`, `App.tsx` | P2 |

---

## 13. Verification Checklist

- [ ] Map renders with Mappls tiles showing accurate Bangalore junctions and road names
- [ ] Typing "Chinnaswamy Stadium" in event form returns correct autosuggest results
- [ ] Selecting a suggestion populates lat/lon fields and map flies to location
- [ ] Fleet dispatch LLM prompt includes real travel times from Distance Matrix API
- [ ] `assignNearestFleet()` uses real road travel time instead of aerial distance
- [ ] Diversion routes render as blue dashed polylines on map between incident and gated junctions
- [ ] Nearby card shows nearest hospital, police station, and parking within 1km of incident
- [ ] Clicking on map shows reverse-geocoded address in popup
- [ ] Map click coordinates can optionally populate event form lat/lon
- [ ] Fallback: if API key is missing, all features degrade gracefully to current behavior
- [ ] `npm run lint && npm run build` passes for frontend
- [ ] `npm run lint && npm run build` passes for backend
- [ ] All existing features still work: pipeline, propagation, counterfactual, fingerprinting
- [ ] Docker compose runs all services with Mappls env vars passed through

---

## 14. API Rate Limits & Quotas

MapMyIndia free tier typically allows:
- ~1,000 requests/day per API
- Distance Matrix: max 40 origins x 40 destinations per call
- Autosuggest: no strict limit but debounce to 300ms minimum

For hackathon demo purposes, these limits are more than sufficient. Production would require a paid plan.

---

## 15. Error Handling Strategy

Every Mappls API call must:
1. Check if API key exists (`import.meta.env.VITE_MAPPLS_API_KEY` / `process.env.MAPPLS_API_KEY`)
2. Wrap in try/catch
3. Return null/empty on failure
4. Fall back to existing behavior (CartoDB tiles, aerial distance, no suggestions)
5. Log warning but never crash the application

```typescript
// Pattern for all Mappls calls:
try {
  const result = await mapplsApiCall(...)
  if (!result) return fallbackValue
  return result
} catch (error) {
  console.warn('[Mappls] API call failed:', error)
  return fallbackValue
}
```
