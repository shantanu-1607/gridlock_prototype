import Groq from 'groq-sdk'

import { graphService } from './graph.service'
import { CongestionForecast } from './simulation.service'

const SEVERITY_HIGH_THRESHOLD = 0.6
const CROWD_PERIMETER_THRESHOLD = 10000
const PERIMETER_RADIUS_METERS = 500
const MAX_SEVERITY_PATH_BARRICADES = 3
const MAX_PERIMETER_BARRICADES = 4

export interface BarricadeEvent {
  category: string
  lat: number
  lon: number
  expected_crowd_size: number | null
  requires_road_closure: boolean
  affected_corridors: string[] | null
  severity_score: number | null
}

export interface BarricadeContext {
  event: BarricadeEvent
  forecast: CongestionForecast
}

export type BarricadeType = 'hard_closure' | 'diversion_sign'
export type BarricadeRule = 'road_closure' | 'severity_path' | 'crowd_perimeter'

export interface BarricadeRecommendation {
  junction_id: string
  location_name: string
  lat: number
  lon: number
  type: BarricadeType
  activate_at: string
  purpose: string
  rule_source: BarricadeRule
}

export interface BarricadePlan {
  barricades: BarricadeRecommendation[]
  rationale: string
  source: 'llm' | 'fallback'
}

const VALID_TYPES: BarricadeType[] = ['hard_closure', 'diversion_sign']

/**
 * Great-circle distance in metres between two lat/lon points.
 */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Rule 1 — requires_road_closure: hard closures at both ends of the affected
 * road segment. We anchor on the epicenter junction and barricade the
 * neighbouring junctions that sit on the affected corridor (the segment ends),
 * falling back to the two nearest neighbours when no corridor matches.
 */
function ruleRoadClosure(event: BarricadeEvent): BarricadeRecommendation[] {
  if (!event.requires_road_closure) return []

  const epicenter = graphService.getNearestJunction(event.lat, event.lon)
  if (!epicenter) return []

  const corridors = (event.affected_corridors ?? []).map((c) => c.toLowerCase())
  const neighbors = graphService.getNeighbors(epicenter.id)

  let segmentEdges = corridors.length
    ? neighbors.filter((e) => corridors.includes(e.corridor.toLowerCase()))
    : []
  if (segmentEdges.length === 0) segmentEdges = neighbors
  segmentEdges = segmentEdges.slice(0, 2)

  const recs: BarricadeRecommendation[] = []
  for (const edge of segmentEdges) {
    const junction = graphService.junctions.get(edge.target)
    if (!junction) continue
    recs.push({
      junction_id: junction.id,
      location_name: junction.name,
      lat: junction.lat,
      lon: junction.lon,
      type: 'hard_closure',
      activate_at: 'T-20 mins',
      purpose: `Hard closure sealing the ${edge.corridor} segment to stop through-traffic entering the closed zone.`,
      rule_source: 'road_closure',
    })
  }
  return recs
}

/**
 * Rule 2 — severity >= High: barricade the junction entry points on the
 * propagation path. We prefer the junctions the forecast newly reaches by
 * T+15/T+30; when the stochastic forecast has fully decayed by then (common),
 * we fall back to the epicenter's downstream neighbours ranked by cascade
 * probability, which is the path congestion would travel.
 */
function ruleSeverityPath(
  event: BarricadeEvent,
  forecast: CongestionForecast,
): BarricadeRecommendation[] {
  if ((event.severity_score ?? 0) < SEVERITY_HIGH_THRESHOLD) return []

  // Forecast-derived entry points (junctions reached after T+0).
  let entryIds = Array.from(new Set([...forecast.t15_nodes, ...forecast.t30_nodes])).filter(
    (id) => !forecast.t0_nodes.includes(id),
  )

  // Fallback: the forecast decayed before T+15, so use the epicenter's
  // downstream neighbours (the propagation path) ranked by cascade probability.
  if (entryIds.length === 0) {
    const epicenter = graphService.getNearestJunction(event.lat, event.lon)
    if (epicenter) {
      entryIds = graphService
        .getNeighbors(epicenter.id)
        .slice()
        .sort((a, b) => b.cascadeProbability - a.cascadeProbability)
        .map((edge) => edge.target)
    }
  }

  const t15Entry = entryIds.slice(0, MAX_SEVERITY_PATH_BARRICADES)

  const recs: BarricadeRecommendation[] = []
  for (const id of t15Entry) {
    const junction = graphService.junctions.get(id)
    if (!junction) continue
    recs.push({
      junction_id: junction.id,
      location_name: junction.name,
      lat: junction.lat,
      lon: junction.lon,
      type: 'hard_closure',
      activate_at: 'T+15 mins',
      purpose: `Block inbound traffic toward ${junction.name} where congestion is forecast to spread within 15 minutes.`,
      rule_source: 'severity_path',
    })
  }
  return recs
}

/**
 * Rule 3 — large public event: perimeter diversion barricades on junctions
 * roughly 500m out from the venue, to redirect approaching traffic.
 */
function ruleCrowdPerimeter(event: BarricadeEvent): BarricadeRecommendation[] {
  if (
    event.category !== 'public_event' ||
    (event.expected_crowd_size ?? 0) <= CROWD_PERIMETER_THRESHOLD
  ) {
    return []
  }

  const perimeter = Array.from(graphService.junctions.values())
    .map((j) => ({ j, dist: haversineMeters(event.lat, event.lon, j.lat, j.lon) }))
    .filter(({ dist }) => dist <= PERIMETER_RADIUS_METERS)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, MAX_PERIMETER_BARRICADES)

  return perimeter.map(({ j }) => ({
    junction_id: j.id,
    location_name: j.name,
    lat: j.lat,
    lon: j.lon,
    type: 'diversion_sign' as BarricadeType,
    activate_at: 'T-10 mins',
    purpose: `Perimeter diversion ~500m from the venue to redirect approaching traffic away from the crowd buildup.`,
    rule_source: 'crowd_perimeter',
  }))
}

/**
 * Deterministic, rule-based barricade plan. Used directly when there's no Groq
 * API key, and as the safety net if the LLM call fails or can't be trusted.
 */
export function generateFallbackBarricadePlan(context: BarricadeContext): BarricadePlan {
  const { event, forecast } = context

  // Rule order defines de-dup priority: a junction matched by an earlier rule
  // keeps that rule's framing.
  const ordered = [
    ...ruleRoadClosure(event),
    ...ruleSeverityPath(event, forecast),
    ...ruleCrowdPerimeter(event),
  ]

  const seen = new Set<string>()
  const barricades: BarricadeRecommendation[] = []
  for (const rec of ordered) {
    if (seen.has(rec.junction_id)) continue
    seen.add(rec.junction_id)
    barricades.push(rec)
  }

  const rationale = barricades.length
    ? `Recommending ${barricades.length} barricade(s) at ${barricades.map((b) => b.location_name).join(', ')} to contain spillover and enforce diversions based on the road-closure status, severity, and crowd scale of this event.`
    : 'No barricades recommended: the event does not meet the road-closure, severity, or crowd-scale thresholds.'

  return { barricades, rationale, source: 'fallback' }
}

interface RawLlmBarricade {
  location: string
  type: string
  activate_at: string
  purpose: string
}

interface RawLlmBarricadePlan {
  rationale: string
  barricades: RawLlmBarricade[]
}

function isValidRawPlan(value: unknown): value is RawLlmBarricadePlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Record<string, unknown>
  return (
    typeof plan.rationale === 'string' &&
    Array.isArray(plan.barricades) &&
    plan.barricades.every(
      (b) =>
        b &&
        typeof b === 'object' &&
        typeof (b as Record<string, unknown>).location === 'string' &&
        typeof (b as Record<string, unknown>).purpose === 'string',
    )
  )
}

function buildSystemPrompt(): string {
  return `You are the AI Command Center for GridLock, a traffic management system in Bengaluru.
Your objective is to explain a barricade placement plan that has already been computed by a rules engine.

You MUST respond ONLY with a valid, perfectly formatted JSON object.
Do NOT wrap the JSON in markdown blocks (like \`\`\`json). Do NOT add any conversational text before or after the JSON.
Only use location names from the "CANDIDATE BARRICADES" list provided — do not invent locations and do not add or remove barricades.

The JSON must exactly match this schema:
{
  "rationale": "<string summarising the overall barricade strategy>",
  "barricades": [
    {
      "location": "<string, exact location name from CANDIDATE BARRICADES>",
      "type": "<string, choose from: 'hard_closure', 'diversion_sign'>",
      "activate_at": "<string, e.g. 'T-20 mins', 'T-10 mins', 'T+15 mins'>",
      "purpose": "<string, one concise sentence explaining why this barricade is placed here>"
    }
  ]
}`
}

function buildUserPrompt(context: BarricadeContext, candidates: BarricadeRecommendation[]): string {
  const { event } = context
  const candidateLines = candidates
    .map(
      (c) =>
        `- ${c.location_name} | suggested type: ${c.type} | suggested activation: ${c.activate_at} | rule: ${c.rule_source}`,
    )
    .join('\n')

  return `EVENT DETAILS:
- Category: ${event.category}
- Location: ${event.lat}, ${event.lon}
- Expected Crowd/Scale: ${event.expected_crowd_size ?? 'N/A'}
- Requires Road Closure: ${event.requires_road_closure}
- Affected Corridors: ${event.affected_corridors?.join(', ') || 'N/A'}
- Severity Score: ${event.severity_score ?? 'N/A'}

CANDIDATE BARRICADES (explain each, keep the same set):
${candidateLines}

INSTRUCTIONS:
1. For each candidate, write a clear one-sentence purpose for a traffic controller.
2. You may refine the type and activate_at, but keep them within the allowed values.
3. Do not add, drop, or rename any barricade. Return strictly JSON.`
}

let groqClient: Groq | null = null
function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return groqClient
}

async function callGroqBarricade(
  context: BarricadeContext,
  candidates: BarricadeRecommendation[],
): Promise<RawLlmBarricadePlan> {
  const client = getGroqClient()
  if (!client) throw new Error('GROQ_API_KEY not configured')

  const completion = await client.chat.completions.create({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(context, candidates) },
    ],
    model: process.env.GROQ_MODEL_ID || 'openai/gpt-oss-120b',
    temperature: 0.2,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  })

  const rawContent = completion.choices[0]?.message?.content || '{}'
  const cleaned = rawContent.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  if (!isValidRawPlan(parsed)) {
    throw new Error('LLM response did not match the expected barricade plan schema')
  }

  return parsed
}

/**
 * Overlays the LLM's explanations (purpose / type / activate_at) onto the
 * rule-derived candidates, matching by location name. Junction IDs, coords and
 * rule_source always come from the rules engine, never the LLM.
 */
function resolveRawPlan(
  raw: RawLlmBarricadePlan,
  candidates: BarricadeRecommendation[],
): BarricadePlan {
  const byName = new Map(candidates.map((c) => [c.location_name.toLowerCase(), c]))
  const seen = new Set<string>()
  const barricades: BarricadeRecommendation[] = []

  for (const rawBarricade of raw.barricades) {
    const candidate = byName.get(rawBarricade.location.toLowerCase())
    if (!candidate || seen.has(candidate.junction_id)) continue
    seen.add(candidate.junction_id)
    barricades.push({
      ...candidate,
      type: VALID_TYPES.includes(rawBarricade.type as BarricadeType)
        ? (rawBarricade.type as BarricadeType)
        : candidate.type,
      activate_at: rawBarricade.activate_at?.trim() || candidate.activate_at,
      purpose: rawBarricade.purpose?.trim() || candidate.purpose,
    })
  }

  return { barricades, rationale: raw.rationale, source: 'llm' }
}

/**
 * Generates the barricade plan: rules pick the placements, the Groq-hosted OSS
 * LLM writes the explanations. Falls back to the deterministic rule-based plan
 * if no API key is configured or the call/response fails validation.
 */
export async function generateBarricadePlan(context: BarricadeContext): Promise<BarricadePlan> {
  const fallback = generateFallbackBarricadePlan(context)

  // No placements to explain — skip the LLM entirely.
  if (fallback.barricades.length === 0) return fallback

  try {
    const raw = await callGroqBarricade(context, fallback.barricades)
    const resolved = resolveRawPlan(raw, fallback.barricades)
    if (resolved.barricades.length === 0) {
      throw new Error('LLM plan referenced no valid candidate barricades')
    }
    return resolved
  } catch (error) {
    console.warn('[BarricadeService] Falling back to rule-based plan:', (error as Error).message)
    return fallback
  }
}
