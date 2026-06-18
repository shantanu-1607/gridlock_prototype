interface ConflictCandidateEvent {
  id: string
  name?: string | null
  category?: string
  lat: number
  lon: number
  start_datetime: string | Date
  expected_end_datetime?: string | Date | null
  duration_mins?: number | null
}

export interface ConflictAlert {
  conflicting_event_id: string
  conflicting_event_name: string
  distance_km: number
  message: string
}

// Events within this radius are considered to be competing for the same
// road network / fleet pool.
const VICINITY_RADIUS_KM = 1.5

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function getEventWindow(event: ConflictCandidateEvent): { start: Date; end: Date } {
  const start = new Date(event.start_datetime)
  const end = event.expected_end_datetime
    ? new Date(event.expected_end_datetime)
    : new Date(start.getTime() + (event.duration_mins ?? 60) * 60000)
  return { start, end }
}

function checkSpatialTemporalOverlap(
  newEvent: ConflictCandidateEvent,
  existingEvent: ConflictCandidateEvent,
): boolean {
  const distanceKm = haversineKm(newEvent.lat, newEvent.lon, existingEvent.lat, existingEvent.lon)
  if (distanceKm > VICINITY_RADIUS_KM) return false

  const a = getEventWindow(newEvent)
  const b = getEventWindow(existingEvent)
  return a.start <= b.end && b.start <= a.end
}

/**
 * Flags active events that overlap both in space (within VICINITY_RADIUS_KM)
 * and time (overlapping start/end windows) with the new event, so the
 * dispatcher knows fleet is being split between competing incidents.
 */
export function findConflicts(
  newEvent: ConflictCandidateEvent,
  activeEvents: ConflictCandidateEvent[],
): ConflictAlert[] {
  return activeEvents
    .filter((e) => e.id !== newEvent.id && checkSpatialTemporalOverlap(newEvent, e))
    .map((e) => {
      const distance_km =
        Math.round(haversineKm(newEvent.lat, newEvent.lon, e.lat, e.lon) * 100) / 100
      const name = e.name || e.category || 'Unnamed event'
      return {
        conflicting_event_id: e.id,
        conflicting_event_name: name,
        distance_km,
        message: `Overlaps with active event "${name}" ~${distance_km}km away during an overlapping time window.`,
      }
    })
}
