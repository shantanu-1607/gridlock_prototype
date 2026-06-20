import Groq from 'groq-sdk'

import { CORRIDOR_CASCADE, DEFAULT_CASCADE } from '../data/corridorCascade'
import { graphService } from './graph.service'

const SEVERITY_HIGH_THRESHOLD = 0.6
const MAX_WALK_HOPS = 4

export interface DiversionEvent {
  category: string
  lat: number
  lon: number
  severity_score: number | null
  risk_level?: string | null
  requires_road_closure: boolean
  affected_corridors: string[] | null
}

export interface DiversionContext {
  event: DiversionEvent
  // Corridors affected by other active events — avoid rerouting onto these.
  competingCorridors?: string[]
}

export interface DiversionEndpoint {
  junction_id: string
  name: string
  lat: number
  lon: number
}

export interface DiversionRoute {
  at_risk_corridor: string // "Corridor X"
  via_corridor: string // "Corridor Y"
  reason: string
  from: DiversionEndpoint // divert-here entry point
  to: DiversionEndpoint // rejoin point (full loop) or one-hop terminus on Y (simple divert)
  rejoins: boolean // true = full X→Y→X loop, false = simple divert onto Y
  // The real corridor-X junction polyline between `from` and `to` (through the
  // epicenter), so the frontend can draw the red at-risk segment without a
  // routing call. The green reroute path is fetched client-side via fetchRoute.
  at_risk_path: { lat: number; lon: number }[]
}

export interface DiversionPlan {
  routes: DiversionRoute[]
  rationale: string
  source: 'rule' | 'llm'
}

const EMPTY_PLAN: DiversionPlan = {
  routes: [],
  rationale:
    'No diversion recommended: the event does not require a road closure and is not forecast to block its corridor.',
  source: 'rule',
}

/**
 * Diversions are only worth recommending when the corridor is actually at risk
 * of being blocked — a hard closure, a high-severity incident, or an elevated
 * blocking-probability risk level. Otherwise normal flow should be left alone.
 */
function divertTrigger(event: DiversionEvent): { trigger: boolean; reason: string } {
  if (event.requires_road_closure) return { trigger: true, reason: 'is being closed' }
  if ((event.severity_score ?? 0) >= SEVERITY_HIGH_THRESHOLD) {
    return { trigger: true, reason: 'is under high-severity congestion' }
  }
  const risk = (event.risk_level ?? '').toLowerCase()
  if (risk === 'red' || risk === 'amber' || risk === 'yellow') {
    return { trigger: true, reason: 'is at elevated risk of blocking' }
  }
  return { trigger: false, reason: '' }
}

/** Distinct named corridors touching a junction (excludes Non-corridor / blanks). */
function corridorsAt(junctionId: string): string[] {
  const set = new Set<string>()
  for (const edge of graphService.getNeighbors(junctionId)) {
    if (edge.corridor && edge.corridor !== 'Non-corridor') set.add(edge.corridor)
  }
  return [...set]
}

/**
 * Walks away from the epicenter along a single corridor, never doubling back,
 * returning the ordered list of junction IDs reached (nearest first).
 */
function walkCorridor(
  epicenterId: string,
  firstHopTargetId: string,
  corridor: string,
  maxHops: number,
): string[] {
  const path = [firstHopTargetId]
  let prev = epicenterId
  let curr = firstHopTargetId
  for (let i = 0; i < maxHops; i++) {
    const next = graphService
      .getNeighbors(curr)
      .find((e) => e.corridor === corridor && e.target !== prev)
    if (!next) break
    path.push(next.target)
    prev = curr
    curr = next.target
  }
  return path
}

interface Transfer {
  id: string
  index: number // distance from epicenter along the side (0 = first hop)
  alts: string[] // alternate corridors available here (≠ corridorX)
}

/** Transfer junctions on a side path: those carrying a corridor other than X. */
function transfersOnPath(path: string[], corridorX: string): Transfer[] {
  const transfers: Transfer[] = []
  path.forEach((id, index) => {
    const alts = corridorsAt(id).filter((c) => c !== corridorX)
    if (alts.length > 0) transfers.push({ id, index, alts })
  })
  return transfers
}

function endpoint(junctionId: string): DiversionEndpoint | null {
  const j = graphService.junctions.get(junctionId)
  if (!j) return null
  return { junction_id: j.id, name: j.name, lat: j.lat, lon: j.lon }
}

function cascadeOf(corridor: string): number {
  return CORRIDOR_CASCADE[corridor] ?? DEFAULT_CASCADE
}

/**
 * Resolves "Corridor X" (the at-risk corridor) from the epicenter's graph
 * edges. Prefers an affected_corridors value that matches a real edge corridor,
 * otherwise the most common corridor among the epicenter's edges.
 */
function resolveCorridorX(epicenterId: string, affected: string[] | null): string | null {
  const edgeCorridors = corridorsAt(epicenterId)
  if (edgeCorridors.length === 0) return null

  const affectedLower = (affected ?? []).map((c) => c.toLowerCase())
  const match = edgeCorridors.find((c) => affectedLower.includes(c.toLowerCase()))
  if (match) return match

  // Most frequent corridor among the epicenter's edges.
  const counts = new Map<string, number>()
  for (const edge of graphService.getNeighbors(epicenterId)) {
    if (edge.corridor && edge.corridor !== 'Non-corridor') {
      counts.set(edge.corridor, (counts.get(edge.corridor) ?? 0) + 1)
    }
  }
  let topCorridor: string | null = null
  let topCount = -1
  for (const [corridor, count] of counts) {
    if (count > topCount) {
      topCount = count
      topCorridor = corridor
    }
  }
  return topCorridor
}

/**
 * Deterministic, graph-derived diversion plan. Finds the at-risk corridor at the
 * epicenter, walks it both ways to locate transfer junctions, and selects the
 * lowest-spillover-risk alternate corridor — preferring a full X→Y→X loop, and
 * falling back to a simple one-hop divert onto Y when no rejoin exists.
 *
 * Note: this never relies on the propagation forecast's T+15/T+30 node sets —
 * those decay to empty almost always — only on graph topology + cascade risk.
 */
export function generateFallbackDiversionPlan(context: DiversionContext): DiversionPlan {
  const { event } = context
  const competing = new Set((context.competingCorridors ?? []).map((c) => c.toLowerCase()))

  const trigger = divertTrigger(event)
  if (!trigger.trigger) return EMPTY_PLAN

  const epicenter = graphService.getNearestJunction(event.lat, event.lon)
  if (!epicenter) return EMPTY_PLAN

  const corridorX = resolveCorridorX(epicenter.id, event.affected_corridors)
  if (!corridorX) {
    return {
      routes: [],
      rationale: `${event.affected_corridors?.[0] ?? 'The affected corridor'} ${trigger.reason}, but the epicenter is not on a mapped corridor, so no graph-based diversion could be derived.`,
      source: 'rule',
    }
  }

  // The two ways out of the epicenter along corridor X.
  const xEdges = graphService.getNeighbors(epicenter.id).filter((e) => e.corridor === corridorX)
  const sideA = xEdges[0]
    ? walkCorridor(epicenter.id, xEdges[0].target, corridorX, MAX_WALK_HOPS)
    : []
  const sideB = xEdges[1]
    ? walkCorridor(epicenter.id, xEdges[1].target, corridorX, MAX_WALK_HOPS)
    : []

  const transfersA = transfersOnPath(sideA, corridorX)
  const transfersB = transfersOnPath(sideB, corridorX)

  const usable = (corridor: string) => !competing.has(corridor.toLowerCase())

  // 1. Prefer a full loop: an alternate corridor Y present on BOTH sides, so
  // traffic can leave X at E (side A), travel Y, and rejoin X at R (side B).
  let best: { Y: string; E: Transfer; R: Transfer; cascade: number } | null = null
  for (const E of transfersA) {
    for (const R of transfersB) {
      const commonY = E.alts.filter((y) => R.alts.includes(y) && usable(y))
      for (const Y of commonY) {
        const cascade = cascadeOf(Y)
        const better =
          !best ||
          cascade < best.cascade ||
          (cascade === best.cascade && E.index + R.index < best.E.index + best.R.index)
        if (better) best = { Y, E, R, cascade }
      }
    }
  }

  if (best) {
    const from = endpoint(best.E.id)
    const to = endpoint(best.R.id)
    if (from && to) {
      const atRiskPath = [
        ...sideA
          .slice(0, best.E.index + 1)
          .reverse()
          .map(endpoint),
        endpoint(epicenter.id),
        ...sideB.slice(0, best.R.index + 1).map(endpoint),
      ]
        .filter((p): p is DiversionEndpoint => p !== null)
        .map((p) => ({ lat: p.lat, lon: p.lon }))

      const route: DiversionRoute = {
        at_risk_corridor: corridorX,
        via_corridor: best.Y,
        reason: `${corridorX} ${trigger.reason}`,
        from,
        to,
        rejoins: true,
        at_risk_path: atRiskPath,
      }
      return {
        routes: [route],
        rationale: `${corridorX} ${trigger.reason}; reroute inbound traffic via ${best.Y}, which carries lower historical spillover risk. Divert at ${from.name} and rejoin ${corridorX} at ${to.name}.`,
        source: 'rule',
      }
    }
  }

  // 2. Fallback: simple divert. Take the nearest transfer junction on either
  // side, pick its lowest-cascade usable alternate, and hop one step onto it.
  const allTransfers = [...transfersA, ...transfersB].sort((a, b) => a.index - b.index)
  for (const T of allTransfers) {
    const candidates = T.alts.filter(usable).sort((a, b) => cascadeOf(a) - cascadeOf(b))
    const Y = candidates[0]
    if (!Y) continue
    const yHop = graphService.getNeighbors(T.id).find((e) => e.corridor === Y)
    const from = endpoint(T.id)
    const to = yHop ? endpoint(yHop.target) : null
    if (!from || !to) continue

    const onSideA = transfersA.includes(T)
    const sidePath = onSideA ? sideA : sideB
    const atRiskPath = [endpoint(epicenter.id), ...sidePath.slice(0, T.index + 1).map(endpoint)]
      .filter((p): p is DiversionEndpoint => p !== null)
      .map((p) => ({ lat: p.lat, lon: p.lon }))

    const route: DiversionRoute = {
      at_risk_corridor: corridorX,
      via_corridor: Y,
      reason: `${corridorX} ${trigger.reason}`,
      from,
      to,
      rejoins: false,
      at_risk_path: atRiskPath,
    }
    return {
      routes: [route],
      rationale: `${corridorX} ${trigger.reason}; divert inbound traffic at ${from.name} onto ${Y} (lower historical spillover risk). No clean rejoin point was found on ${corridorX}, so traffic is handed off to ${Y}.`,
      source: 'rule',
    }
  }

  // 3. No alternate corridor anywhere near the epicenter.
  return {
    routes: [],
    rationale: `${corridorX} ${trigger.reason}, but no alternate corridor connects near the epicenter, so no diversion could be derived from the road graph.`,
    source: 'rule',
  }
}

// --- LLM explanation layer (rules pick the route, Groq writes the prose) ---

interface RawLlmRoute {
  at_risk_corridor: string
  via_corridor: string
  reason: string
}

interface RawLlmDiversionPlan {
  rationale: string
  routes: RawLlmRoute[]
}

function isValidRawPlan(value: unknown): value is RawLlmDiversionPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Record<string, unknown>
  return (
    typeof plan.rationale === 'string' &&
    Array.isArray(plan.routes) &&
    plan.routes.every(
      (r) =>
        r &&
        typeof r === 'object' &&
        typeof (r as Record<string, unknown>).at_risk_corridor === 'string' &&
        typeof (r as Record<string, unknown>).via_corridor === 'string' &&
        typeof (r as Record<string, unknown>).reason === 'string',
    )
  )
}

function buildSystemPrompt(): string {
  return `You are the AI Command Center for GridLock, a traffic management system in Bengaluru.
A rules engine has already computed traffic diversion routes (which corridor is at risk and which alternate corridor to reroute via). Your job is ONLY to explain them clearly to a traffic controller.

You MUST respond ONLY with a valid, perfectly formatted JSON object.
Do NOT wrap the JSON in markdown blocks (like \`\`\`json). Do NOT add any conversational text before or after the JSON.
Only use the corridor names from the "CANDIDATE DIVERSIONS" list provided — do not invent corridor names, and do not add, drop, or change which corridors are involved.

The JSON must exactly match this schema:
{
  "rationale": "<string summarising the overall diversion strategy in 1-2 sentences>",
  "routes": [
    {
      "at_risk_corridor": "<string, exact name from CANDIDATE DIVERSIONS>",
      "via_corridor": "<string, exact name from CANDIDATE DIVERSIONS>",
      "reason": "<string, one concise sentence explaining why this reroute is advised>"
    }
  ]
}`
}

function buildUserPrompt(context: DiversionContext, routes: DiversionRoute[]): string {
  const { event } = context
  const lines = routes
    .map(
      (r) =>
        `- AT RISK: ${r.at_risk_corridor} | REROUTE VIA: ${r.via_corridor} | divert at: ${r.from.name}${r.rejoins ? ` | rejoin at: ${r.to.name}` : ' | (no rejoin, hand off onto alternate)'}`,
    )
    .join('\n')

  return `EVENT DETAILS:
- Category: ${event.category}
- Location: ${event.lat}, ${event.lon}
- Requires Road Closure: ${event.requires_road_closure}
- Severity Score: ${event.severity_score ?? 'N/A'}
- Risk Level: ${event.risk_level ?? 'N/A'}
- Affected Corridors: ${event.affected_corridors?.join(', ') || 'N/A'}

CANDIDATE DIVERSIONS (explain each, keep the same corridors):
${lines}

INSTRUCTIONS:
1. For each diversion, write a clear one-sentence reason for a traffic controller.
2. Do not add, drop, or rename any corridor. Keep at_risk_corridor and via_corridor exactly as given.
3. Return strictly JSON.`
}

let groqClient: Groq | null = null
function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!groqClient) groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return groqClient
}

async function callGroqDiversion(
  context: DiversionContext,
  routes: DiversionRoute[],
): Promise<RawLlmDiversionPlan> {
  const client = getGroqClient()
  if (!client) throw new Error('GROQ_API_KEY not configured')

  const completion = await client.chat.completions.create({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(context, routes) },
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
    throw new Error('LLM response did not match the expected diversion plan schema')
  }

  return parsed
}

/**
 * Overlays the LLM's prose (rationale + per-route reason) onto the rule-derived
 * routes, matched by corridor pair. Junctions, geometry and corridor selection
 * always come from the rules engine, never the LLM.
 */
function resolveRawPlan(raw: RawLlmDiversionPlan, routes: DiversionRoute[]): DiversionPlan {
  const key = (a: string, b: string) => `${a.toLowerCase()}→${b.toLowerCase()}`
  const byPair = new Map(raw.routes.map((r) => [key(r.at_risk_corridor, r.via_corridor), r]))

  const merged = routes.map((route) => {
    const llm = byPair.get(key(route.at_risk_corridor, route.via_corridor))
    return llm?.reason?.trim() ? { ...route, reason: llm.reason.trim() } : route
  })

  return { routes: merged, rationale: raw.rationale, source: 'llm' }
}

/**
 * Generates the diversion plan: rules pick the routes, the Groq-hosted OSS LLM
 * writes the explanations. Falls back to the deterministic rule-based plan if no
 * API key is configured or the call/response fails validation.
 */
export async function generateDiversionPlan(context: DiversionContext): Promise<DiversionPlan> {
  const fallback = generateFallbackDiversionPlan(context)

  // Nothing to explain — skip the LLM entirely.
  if (fallback.routes.length === 0) return fallback

  try {
    const raw = await callGroqDiversion(context, fallback.routes)
    return resolveRawPlan(raw, fallback.routes)
  } catch (error) {
    console.warn('[DiversionService] Falling back to rule-based plan:', (error as Error).message)
    return fallback
  }
}
