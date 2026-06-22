/**
 * Shared planning vocabulary + UI mappings for the event planner.
 *
 * Decoupled from the form view so it's a single source of truth across the team and
 * stays aligned with the ML model's training vocabulary. The corridor list mirrors
 * the corridors the model was trained on (`apps/ml` schema) — the previously-default
 * "Outer Ring Road" was NOT in that vocabulary (it routed out-of-distribution and
 * relied on backend normalization), so the specific ORR segments are used instead.
 */
export const CORRIDORS = [
  'ORR East 1',
  'ORR East 2',
  'ORR North 1',
  'ORR North 2',
  'ORR West 1',
  'Hosur Road',
  'Bellary Road 1',
  'Bellary Road 2',
  'Old Madras Road',
  'Mysore Road',
  'Tumkur Road',
  'Bannerghata Road',
  'Magadi Road',
  'Old Airport Road',
  'Hennur Main Road',
  'Varthur Road',
  'West of Chord Road',
  'CBD 2',
  'Non-corridor',
] as const

export const DEFAULT_CORRIDOR = 'ORR East 1'

export const CATEGORIES = [
  'Accident',
  'Protest',
  'VIP Movement',
  'Water Logging',
  'Tree Fall',
  'Public Event',
  'Procession',
  'Construction',
  'Congestion',
  'Vehicle Breakdown',
  'Road Conditions',
  'Others',
] as const

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const

export const PRIORITY_CLASSES: Record<string, string> = {
  Low: 'border-green/40 bg-green/15 text-green',
  Medium: 'border-yellow/40 bg-yellow/15 text-yellow',
  High: 'border-orange/40 bg-orange/15 text-orange',
  Critical: 'border-red/40 bg-red/15 text-red',
}
