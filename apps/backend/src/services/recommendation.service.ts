import Groq from 'groq-sdk'

import { graphService } from './graph.service'
import { DistanceMatrixResult, getDistanceMatrix } from './mappls.service'
import { CongestionForecast } from './simulation.service'

export interface FleetMember {
  id: string
  name: string
  current_lat: number
  current_lon: number
}

export interface HistoricalPrecedent {
  avgSecondaryIncidents: number
  summary: string
}

export interface PredictionInterval {
  lower_mins: number | null
  upper_mins: number | null
  coverage?: number | null
  source?: string
}

export interface DispatchContext {
  event: {
    type: string
    category: string
    lat: number
    lon: number
    expected_crowd_size: number | null
    duration_mins: number | null
    severity_score: number | null
    affected_corridors: string[] | null
    requires_road_closure: boolean
    // Uncertainty from the ML pipeline — drives the contingency reserve.
    confidence?: number | null
    prediction_interval?: PredictionInterval | null
  }
  forecast: CongestionForecast
  precedents: HistoricalPrecedent
  availableFleet: FleetMember[]
}

export interface UncertaintyAssessment {
  level: 'low' | 'elevated' | 'high'
  tailRatio: number | null // upper bound of 90% interval / point estimate
  reserve: number // contingency units to pre-stage
  note: string
}

/**
 * Turns ML prediction uncertainty into a concrete dispatch signal. A wide
 * conformal interval means the incident could run much longer than the point
 * estimate, so we pre-stage a small contingency reserve for extended-duration
 * coverage rather than treating confidence as a hidden display-only metric.
 */
export function assessUncertainty(event: DispatchContext['event']): UncertaintyAssessment {
  const dur = event.duration_mins ?? null
  const upper = event.prediction_interval?.upper_mins ?? null
  const confidence = event.confidence ?? null

  const tailRatio = dur && dur > 0 && upper ? upper / dur : null

  let level: UncertaintyAssessment['level'] = 'low'
  if ((tailRatio !== null && tailRatio >= 3) || (confidence !== null && confidence < 0.45)) {
    level = 'high'
  } else if ((tailRatio !== null && tailRatio >= 2) || (confidence !== null && confidence < 0.6)) {
    level = 'elevated'
  }

  const reserve = level === 'high' ? 2 : level === 'elevated' ? 1 : 0

  let note = ''
  if (level !== 'low') {
    const ratioTxt = tailRatio !== null ? `${tailRatio.toFixed(1)}×` : 'well above'
    const upTxt = upper !== null ? ` (90% interval up to ${Math.round(upper)} min` : ''
    const durTxt = dur !== null ? `, ${ratioTxt} the ${Math.round(dur)}-min estimate)` : ')'
    note =
      `Prediction uncertainty is ${level}${upTxt}${upTxt ? durTxt : ''}; ` +
      `pre-staging ${reserve} contingency unit${reserve === 1 ? '' : 's'} for extended-duration coverage.`
  }

  return { level, tailRatio, reserve, note }
}

export interface AssignedFleetMember {
  user_id: string
  user_name: string
}

export interface Deployment {
  junction: string
  junctionName: string
  fleet_count: number
  role: string
  priority: string
  deployByMins: number
  assignedFleet: AssignedFleetMember[]
  lat: number
  lon: number
}

export interface DispatchPlan {
  total_fleet_required: number
  rationale: string
  deployments: Deployment[]
  source: 'llm' | 'fallback'
  contingency_reserve?: number
  uncertainty_level?: 'low' | 'elevated' | 'high'
}

const PRECEDENT_TABLE: Record<string, HistoricalPrecedent> = {
  public_event: {
    avgSecondaryIncidents: 1.8,
    summary:
      'Public events of comparable crowd size have historically triggered 1-2 secondary congestion incidents on adjoining corridors within 30 minutes.',
  },
  vehicle_breakdown: {
    avgSecondaryIncidents: 0.6,
    summary:
      'Vehicle breakdowns rarely cascade beyond the immediate junction, but lane-blocking cases during peak hours produced secondary slowdowns in roughly 30% of past incidents.',
  },
  accident: {
    avgSecondaryIncidents: 1.3,
    summary:
      'Accidents of comparable severity led to an average of 1.3 secondary incidents nearby, typically at downstream junctions within 15 minutes.',
  },
  road_work: {
    avgSecondaryIncidents: 0.9,
    summary:
      'Planned road work has a moderate secondary incident rate, concentrated at diversion entry points.',
  },
}

const DEFAULT_PRECEDENT: HistoricalPrecedent = {
  avgSecondaryIncidents: 1.0,
  summary: 'No close historical match found; using the citywide baseline secondary incident rate.',
}

/**
 * Stand-in for the ML fingerprinting service referenced in the feature spec
 * (not built yet) — returns a category-keyed historical summary.
 */
export function getHistoricalPrecedents(category: string): HistoricalPrecedent {
  return PRECEDENT_TABLE[category] ?? DEFAULT_PRECEDENT
}

export interface CompetingEvent {
  severity_score: number | null
  lat: number
  lon: number
}

/**
 * Splits a shared fleet pool across spatially/temporally competing incidents by
 * severity weight, returning the subset of `availableFleet` this event may claim
 * (its nearest members up to its fair share). Prevents the first-planned event
 * from greedily draining a pool that competing active events also need — a
 * dynamic, conflict-aware allocation rather than static first-come dispatch.
 */
export function allocateFleetShare(
  thisEvent: { lat: number; lon: number; severity_score: number | null },
  competingEvents: CompetingEvent[],
  availableFleet: FleetMember[],
): { fleet: FleetMember[]; share: number; fairCount: number } {
  if (competingEvents.length === 0 || availableFleet.length === 0) {
    return { fleet: availableFleet, share: 1, fairCount: availableFleet.length }
  }
  const sev = (s: number | null | undefined) => Math.max(0.1, s ?? 0.5)
  const thisSev = sev(thisEvent.severity_score)
  const totalSev = thisSev + competingEvents.reduce((sum, e) => sum + sev(e.severity_score), 0)
  const share = thisSev / totalSev
  const fairCount = Math.max(1, Math.floor(availableFleet.length * share))
  // Claim this event's nearest members; leave the rest for competing incidents.
  const byDistance = [...availableFleet].sort(
    (a, b) =>
      Math.hypot(a.current_lat - thisEvent.lat, a.current_lon - thisEvent.lon) -
      Math.hypot(b.current_lat - thisEvent.lat, b.current_lon - thisEvent.lon),
  )
  return { fleet: byDistance.slice(0, fairCount), share, fairCount }
}

const VALID_ROLES = ['traffic_direction', 'incident_clearance', 'diversion_management']
const VALID_PRIORITIES = ['Critical', 'High', 'Medium', 'Low']

/**
 * Assigns the `count` nearest members of fleetPool to (lat, lon), removing
 * them from the pool so they can't be double-booked across deployments.
 */
export function assignNearestFleet(
  lat: number,
  lon: number,
  count: number,
  fleetPool: FleetMember[],
  getDistance?: (member: FleetMember) => number,
): AssignedFleetMember[] {
  const assigned: AssignedFleetMember[] = []

  for (let i = 0; i < count && fleetPool.length > 0; i++) {
    let nearestIdx = 0
    let minDist = Infinity
    fleetPool.forEach((member, idx) => {
      const dist = getDistance
        ? getDistance(member)
        : Math.hypot(member.current_lat - lat, member.current_lon - lon)
      if (dist < minDist) {
        minDist = dist
        nearestIdx = idx
      }
    })
    const [member] = fleetPool.splice(nearestIdx, 1)
    assigned.push({ user_id: member.id, user_name: member.name })
  }

  return assigned
}

const ESCALATION_TIERS = [
  { role: 'traffic_direction', priority: 'Critical', deployByMins: 0 },
  { role: 'incident_clearance', priority: 'High', deployByMins: 10 },
  { role: 'diversion_management', priority: 'Medium', deployByMins: 25 },
]

/**
 * Deterministic, rule-based dispatch plan. Used directly when there's no
 * Groq API key, and as the safety net if the LLM call fails or returns
 * something we can't trust.
 */
export function generateFallbackPlan(
  context: DispatchContext,
  travelTimes?: DistanceMatrixResult | null,
  candidateJunctions?: { id: string }[],
): DispatchPlan {
  const { event, forecast, precedents, availableFleet } = context

  const t15New = forecast.t15_nodes.filter((id) => !forecast.t0_nodes.includes(id))
  const t30New = forecast.t30_nodes.filter((id) => !forecast.t15_nodes.includes(id))

  const targets = [
    ...forecast.t0_nodes.map((id) => ({ id, ...ESCALATION_TIERS[0] })),
    ...t15New.map((id) => ({ id, ...ESCALATION_TIERS[1] })),
    ...t30New.map((id) => ({ id, ...ESCALATION_TIERS[2] })),
  ].slice(0, availableFleet.length)

  const fleetPool = [...availableFleet]
  const deployments: Deployment[] = []

  for (const target of targets) {
    const junction = graphService.junctions.get(target.id)
    if (!junction || fleetPool.length === 0) continue

    let getDistance: ((member: FleetMember) => number) | undefined
    if (travelTimes && candidateJunctions) {
      const junctionIdx = candidateJunctions.findIndex((j) => j.id === target.id)
      if (junctionIdx !== -1) {
        getDistance = (member) => {
          const fleetIdx = context.availableFleet.findIndex((f) => f.id === member.id)
          return (
            travelTimes.durations[fleetIdx]?.[junctionIdx] ??
            Math.hypot(member.current_lat - junction.lat, member.current_lon - junction.lon)
          )
        }
      }
    }

    const assignedFleet = assignNearestFleet(junction.lat, junction.lon, 1, fleetPool, getDistance)
    if (assignedFleet.length === 0) continue

    deployments.push({
      junction: target.id,
      junctionName: junction.name,
      fleet_count: 1,
      role: target.role,
      priority: target.priority,
      deployByMins: target.deployByMins,
      assignedFleet,
      lat: junction.lat,
      lon: junction.lon,
    })
  }

  // Uncertainty-driven contingency reserve: pre-stage extra fleet at the
  // epicenter when the 90% interval implies the incident could run long.
  const uncertainty = assessUncertainty(event)
  let stagedReserve = 0
  if (uncertainty.reserve > 0 && fleetPool.length > 0) {
    const epicenterId = forecast.t0_nodes[0] ?? deployments[0]?.junction
    const epicenter = epicenterId ? graphService.junctions.get(epicenterId) : undefined
    if (epicenter) {
      const reserveFleet = assignNearestFleet(
        epicenter.lat,
        epicenter.lon,
        uncertainty.reserve,
        fleetPool,
      )
      if (reserveFleet.length > 0) {
        stagedReserve = reserveFleet.length
        deployments.push({
          junction: epicenter.id,
          junctionName: epicenter.name,
          fleet_count: reserveFleet.length,
          role: 'incident_clearance',
          priority: 'High',
          deployByMins: 0,
          assignedFleet: reserveFleet,
          lat: epicenter.lat,
          lon: epicenter.lon,
        })
      }
    }
  }

  const corridorList = event.affected_corridors?.join(', ') || 'the affected corridors'
  const baseRationale = deployments.length
    ? `Propagation model forecasts congestion reaching ${deployments.map((d) => d.junctionName).join(', ')} within 30 minutes along ${corridorList}. ${precedents.summary} Pre-positioning fleet now should contain spillover before it compounds.`
    : `No junctions are forecasted to exceed the spread threshold in the next 30 minutes; holding fleet on standby. ${precedents.summary}`
  const rationale = uncertainty.note ? `${baseRationale} ${uncertainty.note}` : baseRationale

  return {
    total_fleet_required: deployments.reduce((sum, d) => sum + d.assignedFleet.length, 0),
    rationale,
    deployments,
    source: 'fallback',
    contingency_reserve: stagedReserve,
    uncertainty_level: uncertainty.level,
  }
}

interface RawLlmDeployment {
  junction: string
  fleet_count: number
  role: string
  deploy_by_mins: number
  priority: string
}

interface RawLlmPlan {
  total_fleet_required: number
  rationale: string
  deployments: RawLlmDeployment[]
}

function buildSystemPrompt(): string {
  return `You are the AI Command Center for GridLock, a traffic management system in Bengaluru.
Your objective is to generate an actionable fleet dispatch plan based on real-time traffic data, historical precedents, and available fleet inventory.

You MUST respond ONLY with a valid, perfectly formatted JSON object.
Do NOT wrap the JSON in markdown blocks (like \`\`\`json). Do NOT add any conversational text before or after the JSON.
Only use junction names from the "CANDIDATE JUNCTIONS" list provided — do not invent junction names.

The JSON must exactly match this schema:
{
  "total_fleet_required": <integer>,
  "rationale": "<string explaining the deployment strategy based on the forecast and precedents>",
  "deployments": [
    {
      "junction": "<string, exact name from CANDIDATE JUNCTIONS>",
      "fleet_count": <integer>,
      "role": "<string, choose from: 'traffic_direction', 'incident_clearance', 'diversion_management'>",
      "deploy_by_mins": <integer, 0 for immediate, positive for minutes from now>,
      "priority": "<string, choose from: 'Critical', 'High', 'Medium', 'Low'>"
    }
  ]
}`
}

function buildUserPrompt(
  context: DispatchContext,
  candidateJunctionNames: string[],
  travelTimes: DistanceMatrixResult | null,
): string {
  const { event, forecast, precedents, availableFleet } = context

  const nameOf = (id: string) => graphService.junctions.get(id)?.name ?? id

  return `EVENT DETAILS:
- Type: ${event.type} / ${event.category}
- Location: ${event.lat}, ${event.lon}
- Expected Crowd/Scale: ${event.expected_crowd_size ?? 'N/A'}
- Requires Road Closure: ${event.requires_road_closure}
- Affected Corridors: ${event.affected_corridors?.join(', ') || 'N/A'}
- ML Predicted Duration: ${event.duration_mins ?? 'N/A'} mins
- ML Severity Score: ${event.severity_score ?? 'N/A'}
- ML Confidence: ${event.confidence ?? 'N/A'}
- Duration 90% Interval: ${
    typeof event.prediction_interval?.lower_mins === 'number' &&
    typeof event.prediction_interval?.upper_mins === 'number'
      ? `${Math.round(event.prediction_interval.lower_mins)}–${Math.round(event.prediction_interval.upper_mins)} mins`
      : 'N/A'
  }

ACTIVE CONGESTION FORECAST (Predicted Spread):
- T+0 mins: ${forecast.t0_nodes.map(nameOf).join(', ') || 'None'}
- T+15 mins: ${forecast.t15_nodes.map(nameOf).join(', ') || 'None'}
- T+30 mins: ${forecast.t30_nodes.map(nameOf).join(', ') || 'None'}

CANDIDATE JUNCTIONS (you may only deploy to these):
${candidateJunctionNames.join(', ') || 'None — recommend holding fleet on standby'}

HISTORICAL PRECEDENTS (similar past events):
${precedents.summary}

AVAILABLE FLEET WITH TRAVEL TIMES:
${availableFleet
  .map((f, i) => {
    if (candidateJunctionNames.length === 0) return `- ${f.name} (Standby)`
    const etas = candidateJunctionNames
      .map((name, j) => {
        const mins =
          travelTimes?.durations[i]?.[j] !== undefined
            ? Math.round(travelTimes.durations[i][j] / 60)
            : '?'
        return `${mins} min to ${name}`
      })
      .join(', ')
    return `- ${f.name} (${etas})`
  })
  .join('\\n')}

INSTRUCTIONS:
1. Review the congestion forecast to see where traffic will spread.
2. Review historical precedents to understand secondary risks.
3. Assign available fleet to candidate junctions to mitigate the impact. Do not assign more fleet in total than ${availableFleet.length}.
4. If the duration 90% interval is wide relative to the predicted duration (high uncertainty), reserve 1-2 extra units at the epicenter for extended-duration coverage, and say so in the rationale.
5. Return the response strictly as JSON.`
}

function isValidRawPlan(value: unknown): value is RawLlmPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Record<string, unknown>
  return (
    typeof plan.rationale === 'string' &&
    Array.isArray(plan.deployments) &&
    plan.deployments.every(
      (d) =>
        d &&
        typeof d === 'object' &&
        typeof (d as Record<string, unknown>).junction === 'string' &&
        typeof (d as Record<string, unknown>).fleet_count === 'number',
    )
  )
}

let groqClient: Groq | null = null
function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return groqClient
}

async function callGroqDispatch(
  context: DispatchContext,
  travelTimes: DistanceMatrixResult | null,
  candidateJunctions: { name: string }[],
): Promise<RawLlmPlan> {
  const client = getGroqClient()
  if (!client) throw new Error('GROQ_API_KEY not configured')

  const candidateJunctionNames = candidateJunctions.map((j) => j.name)

  const promptContent = buildUserPrompt(context, candidateJunctionNames, travelTimes)
  console.log('[RecommendationService] Generated LLM Prompt:\\n', promptContent)

  const completion = await client.chat.completions.create({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: promptContent },
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
    throw new Error('LLM response did not match the expected dispatch plan schema')
  }

  return parsed
}

/**
 * Resolves the LLM's raw plan (junction names + headcounts) into concrete
 * fleet assignments, matching junction names back to graph IDs and picking
 * the nearest available personnel for each deployment.
 */
function resolveRawPlan(
  raw: RawLlmPlan,
  context: DispatchContext,
  travelTimes: DistanceMatrixResult | null,
  candidateJunctions: { id: string }[],
): DispatchPlan {
  const nameToJunction = new Map(
    Array.from(graphService.junctions.values()).map((j) => [j.name.toLowerCase(), j]),
  )

  const fleetPool = [...context.availableFleet]
  const deployments: Deployment[] = []

  for (const raw_deployment of raw.deployments) {
    const junction = nameToJunction.get(raw_deployment.junction.toLowerCase())
    if (!junction || fleetPool.length === 0) continue

    let getDistance: ((member: FleetMember) => number) | undefined
    if (travelTimes) {
      const junctionIdx = candidateJunctions.findIndex((j) => j.id === junction.id)
      if (junctionIdx !== -1) {
        getDistance = (member) => {
          const fleetIdx = context.availableFleet.findIndex((f) => f.id === member.id)
          return (
            travelTimes.durations[fleetIdx]?.[junctionIdx] ??
            Math.hypot(member.current_lat - junction.lat, member.current_lon - junction.lon)
          )
        }
      }
    }

    const fleetCount = Math.max(1, Math.floor(raw_deployment.fleet_count) || 1)
    const assignedFleet = assignNearestFleet(
      junction.lat,
      junction.lon,
      fleetCount,
      fleetPool,
      getDistance,
    )
    if (assignedFleet.length === 0) continue

    deployments.push({
      junction: junction.id,
      junctionName: junction.name,
      fleet_count: assignedFleet.length,
      role: VALID_ROLES.includes(raw_deployment.role) ? raw_deployment.role : 'traffic_direction',
      priority: VALID_PRIORITIES.includes(raw_deployment.priority)
        ? raw_deployment.priority
        : 'Medium',
      deployByMins: Number.isFinite(raw_deployment.deploy_by_mins)
        ? raw_deployment.deploy_by_mins
        : 0,
      assignedFleet,
      lat: junction.lat,
      lon: junction.lon,
    })
  }

  const uncertainty = assessUncertainty(context.event)

  return {
    total_fleet_required: deployments.reduce((sum, d) => sum + d.assignedFleet.length, 0),
    rationale: raw.rationale,
    deployments,
    source: 'llm',
    contingency_reserve: uncertainty.reserve,
    uncertainty_level: uncertainty.level,
  }
}

/**
 * Generates the fleet dispatch plan via the Groq-hosted OSS LLM, falling
 * back to the deterministic rule-based plan if no API key is configured or
 * the call/response fails validation.
 */
export async function generateDispatchPlan(context: DispatchContext): Promise<DispatchPlan> {
  const candidateIds = Array.from(
    new Set([
      ...context.forecast.t0_nodes,
      ...context.forecast.t15_nodes,
      ...context.forecast.t30_nodes,
    ]),
  )
  const candidateJunctions = candidateIds
    .map((id) => graphService.junctions.get(id))
    .filter((j): j is NonNullable<typeof j> => j !== undefined)

  const travelTimes = await getDistanceMatrix(
    context.availableFleet.map((f) => ({ lat: f.current_lat, lon: f.current_lon })),
    candidateJunctions.map((j) => ({ lat: j.lat, lon: j.lon })),
  )

  try {
    const raw = await callGroqDispatch(context, travelTimes, candidateJunctions)
    const resolved = resolveRawPlan(raw, context, travelTimes, candidateJunctions)
    if (resolved.deployments.length === 0 && raw.deployments.length > 0) {
      throw new Error('LLM plan referenced no valid candidate junctions')
    }
    return resolved
  } catch (error) {
    console.warn(
      '[RecommendationService] Falling back to rule-based plan:',
      (error as Error).message,
    )
    return generateFallbackPlan(context, travelTimes, candidateJunctions)
  }
}
