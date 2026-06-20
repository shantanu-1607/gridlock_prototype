import { Request, Response } from 'express'

import { generateBarricadePlan } from '../services/barricade.service'
import { findConflicts } from '../services/conflict.service'
import { generateDiversionPlan } from '../services/diversion.service'
import { graphService } from '../services/graph.service'
import {
  publishWsEvent,
  redisConnection,
  removePropagationJob,
  schedulePropagationJob,
} from '../services/queue.service'
import {
  allocateFleetShare,
  assignNearestFleet,
  generateDispatchPlan,
  getHistoricalPrecedents,
} from '../services/recommendation.service'
import { simulationService } from '../services/simulation.service'
import { query } from '../utils/db'

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000'

/**
 * Schedules the propagation simulation without letting a missing/unreachable
 * Redis block the planning response. BullMQ/ioredis (maxRetriesPerRequest:null)
 * queue commands indefinitely when Redis is down, which would hang the request;
 * this bounds the wait and proceeds — the propagation job is a background
 * simulation, not required for the plan response to be correct.
 */
async function schedulePropagationSafe(
  eventId: string,
  severity: number,
  durationMins: number,
  lat: number,
  lon: number,
) {
  try {
    await Promise.race([
      schedulePropagationJob(eventId, severity, durationMins, lat, lon),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('redis unavailable (timed out)')), 3000),
      ),
    ])
  } catch (err) {
    console.warn('[Plan] Propagation scheduling skipped:', (err as Error).message)
  }
}

/**
 * Call ML prediction endpoint.
 */
async function callMLPredict(eventData: any) {
  try {
    const response = await fetch(`${ML_BASE}/api/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    })
    if (response.ok) {
      const data = await response.json()
      return {
        duration_mins: data.predicted_duration_mins,
        severity_score: data.severity_score,
        severity_label: data.severity_label,
        confidence: data.confidence,
        similar_events: data.similar_events || [],
        aggregated: data.aggregated || null,
        fingerprint_meta: data.fingerprint_meta || null,
        prediction_interval: data.prediction_interval || null,
        confidence_factors: data.confidence_factors || null,
      }
    }
  } catch (error) {
    console.log('[ML] Predict endpoint not reachable, using stubbed values.')
  }
  // Fallback only when the ML service is unreachable — 60 min is a neutral
  // city-typical incident duration, not a real prediction.
  return {
    duration_mins: 60,
    severity_score: 0.8,
    severity_label: 'High',
    confidence: 0.5,
    similar_events: [],
    aggregated: null,
    fingerprint_meta: null,
    prediction_interval: null,
    confidence_factors: null,
  }
}

/**
 * Call ML queueing analysis endpoint.
 */
async function callQueueAnalysis(params: {
  predicted_duration_mins: number
  corridor: string
  event_cause: string
  hour: number
  requires_road_closure: boolean
}) {
  try {
    const response = await fetch(`${ML_BASE}/api/ml/queue-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (response.ok) return await response.json()
  } catch (error) {
    console.log('[ML] Queue analysis endpoint not reachable, using defaults.')
  }
  return {
    blocking_probability: 0.5,
    expected_queue_length: 50,
    expected_wait_time: 5,
    time_to_spillover: -1,
    risk_level: 'yellow',
    utilization: 0.8,
    effective_service_rate: 20,
    effective_arrival_rate: 30,
  }
}

/**
 * Call ML deployment recommendation endpoint.
 */
async function callDeployment(junctions: any[], officers: number, barricades: number) {
  try {
    const response = await fetch(`${ML_BASE}/api/ml/deployment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        junctions,
        available_officers: officers,
        available_barricades: barricades,
      }),
    })
    if (response.ok) return await response.json()
  } catch (error) {
    console.log('[ML] Deployment endpoint not reachable.')
  }
  return { recommendations: [], total_officers_deployed: 0, total_barricades_deployed: 0 }
}

/**
 * Call ML gating recommendation endpoint.
 */
async function callGating(params: any) {
  try {
    const response = await fetch(`${ML_BASE}/api/ml/gating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (response.ok) return await response.json()
  } catch (error) {
    console.log('[ML] Gating endpoint not reachable.')
  }
  return { risk_level: 'yellow', blocking_probability: 0.5, recommendations: [] }
}

/**
 * Call ML anomaly detection endpoint.
 */
async function callAnomalyDetection(params: {
  corridor: string
  event_cause: string
  start_datetime: string
  predicted_duration_mins: number
}) {
  try {
    const response = await fetch(`${ML_BASE}/api/ml/anomaly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (response.ok) return await response.json()
  } catch (error) {
    console.log('[ML] Anomaly detection endpoint not reachable.')
  }
  return {
    anomaly_score: 0.0,
    anomaly_label: 'unknown',
    expected_duration_mins: params.predicted_duration_mins,
    deviation_pct: 0.0,
    model_source: 'none',
    context: 'Anomaly detection unavailable',
  }
}

/**
 * Call ML counterfactual analysis endpoint.
 */
async function callCounterfactual(params: {
  event_id: string
  predicted_duration_mins: number
  actual_duration_mins: number
  corridor: string
  event_cause: string
  start_datetime: string
  officers_deployed: number
  barricades_deployed: number
  gating_applied: boolean
}) {
  try {
    const response = await fetch(`${ML_BASE}/api/ml/counterfactual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    if (response.ok) return await response.json()
  } catch (error) {
    console.log('[ML] Counterfactual endpoint not reachable.')
  }
  return null
}

/**
 * Build a pre-staging countdown timeline for a planned event.
 */
function buildPrestagingTimeline(
  startDatetime: string,
  durationMins: number,
  riskLevel: string,
  deploymentPlan: any,
) {
  const start = new Date(startDatetime)
  const timeline = []

  // T-60 min: Alert & initial briefing
  timeline.push({
    offset_mins: -60,
    time: new Date(start.getTime() - 60 * 60000).toISOString(),
    action: 'ALERT_BRIEFING',
    title: 'Command Alert & Briefing',
    description: `Incident planning alert issued. Predicted duration: ${durationMins} min. Risk: ${riskLevel.toUpperCase()}. Brief all deployed units.`,
  })

  // T-45 min: Deploy barricades
  if (deploymentPlan?.recommendations?.length > 0) {
    const barricadeJunctions = deploymentPlan.recommendations
      .filter((r: any) => r.barricades > 0)
      .map((r: any) => `${r.junction_name} (${r.barricades})`)
      .join(', ')
    if (barricadeJunctions) {
      timeline.push({
        offset_mins: -45,
        time: new Date(start.getTime() - 45 * 60000).toISOString(),
        action: 'DEPLOY_BARRICADES',
        title: 'Physical Barricade Deployment',
        description: `Deploy barricades at: ${barricadeJunctions}`,
      })
    }
  }

  // T-30 min: Deploy officers + activate gating
  timeline.push({
    offset_mins: -30,
    time: new Date(start.getTime() - 30 * 60000).toISOString(),
    action: 'DEPLOY_OFFICERS',
    title: 'Officer Deployment & Signal Adjustment',
    description: `Deploy traffic officers to assigned junctions. Activate perimeter gating at boundary intersections.`,
  })

  // T-15 min: Final check
  timeline.push({
    offset_mins: -15,
    time: new Date(start.getTime() - 15 * 60000).toISOString(),
    action: 'FINAL_CHECK',
    title: 'Final Readiness Check',
    description:
      'Confirm all units in position. Verify diversion signage. Test communication channels.',
  })

  // T-0: Event starts
  timeline.push({
    offset_mins: 0,
    time: start.toISOString(),
    action: 'EVENT_START',
    title: 'Event Begins — Active Monitoring',
    description: 'Switch to real-time monitoring mode. Propagation simulation active.',
  })

  // T+duration: Expected clearance
  timeline.push({
    offset_mins: durationMins,
    time: new Date(start.getTime() + durationMins * 60000).toISOString(),
    action: 'EXPECTED_CLEARANCE',
    title: 'Expected Clearance',
    description: `Predicted incident clearance at T+${durationMins} min. Begin stand-down assessment.`,
  })

  return timeline
}

/**
 * Run forward propagation simulation for T+5, T+15, T+30 minute forecasts.
 */
function runPropagationForecast(lat: number, lon: number, severity: number, durationMins: number) {
  const state = simulationService.initializeState(lat, lon, severity)
  const forecasts: Record<string, any> = {}

  let currentState = state
  // Each tick = 30 seconds, so T+5min = 10 ticks, T+15min = 30 ticks, T+30min = 60 ticks
  const checkpoints = [
    { label: 'T+5min', ticks: 10 },
    { label: 'T+15min', ticks: 30 },
    { label: 'T+30min', ticks: 60 },
  ]

  let ticksSoFar = 0
  for (const cp of checkpoints) {
    const ticksNeeded = cp.ticks - ticksSoFar
    for (let i = 0; i < ticksNeeded; i++) {
      currentState = simulationService.tick(
        currentState,
        { barricades: [], fleetDeployments: [] },
        '12:00',
        [],
        true,
        severity,
        durationMins,
      )
    }
    ticksSoFar = cp.ticks
    forecasts[cp.label] = { ...currentState }
  }

  return forecasts
}

/**
 * POST /api/events/plan — Core planning pipeline.
 *
 * Accepts a planned event, runs the full predictive criticality pipeline:
 * 1. ML prediction (duration + severity)
 * 2. Queueing analysis (blocking probability, risk level)
 * 3. Fingerprinting (similar historical incidents)
 * 4. Propagation forecast (T+5, T+15, T+30 min shockwave)
 * 5. Resource deployment plan (officers + barricades)
 * 6. Advisory gating (signal timing recommendations)
 * 7. Pre-staging timeline (T-60 to T+duration countdown)
 */
export const planEvent = async (req: Request, res: Response) => {
  try {
    const {
      type = 'planned',
      category,
      name,
      description,
      lat,
      lon,
      expected_crowd_size,
      start_datetime,
      expected_end_datetime,
      affected_corridors,
      requires_road_closure,
      veh_type,
      priority,
    } = req.body

    const corridor =
      Array.isArray(affected_corridors) && affected_corridors.length > 0
        ? affected_corridors[0]
        : typeof affected_corridors === 'string'
          ? affected_corridors
          : 'Non-corridor'

    const eventHour = new Date(start_datetime).getHours()

    // 1. Insert event record with status 'planned'
    const insertQuery = `
      INSERT INTO events (
        type, category, name, description, lat, lon, expected_crowd_size,
        start_datetime, expected_end_datetime, affected_corridors,
        requires_road_closure, veh_type, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'planned')
      RETURNING id
    `
    const insertResult = await query(insertQuery, [
      type,
      category,
      name,
      description,
      lat,
      lon,
      expected_crowd_size,
      start_datetime,
      expected_end_datetime,
      affected_corridors,
      requires_road_closure || false,
      veh_type,
      priority,
    ])
    const eventId = insertResult.rows[0].id
    console.log(`[Plan] Created planned event ${eventId}: ${category} on ${corridor}`)

    // 2. ML Prediction
    const mlResult = await callMLPredict({
      start_datetime,
      latitude: lat,
      longitude: lon,
      event_cause: category,
      corridor,
      priority: priority || 'Medium',
      requires_road_closure: requires_road_closure || false,
      event_type: type,
      veh_type: veh_type || '',
      police_station: '',
      zone: '',
    })
    console.log(
      `[Plan] ML prediction: ${mlResult.duration_mins} min, severity=${mlResult.severity_score}`,
    )

    // 3. Queueing Analysis
    const queueResult = await callQueueAnalysis({
      predicted_duration_mins: mlResult.duration_mins,
      corridor,
      event_cause: category,
      hour: eventHour,
      requires_road_closure: requires_road_closure || false,
    })
    console.log(
      `[Plan] Queue analysis: risk=${queueResult.risk_level}, P_block=${queueResult.blocking_probability}`,
    )

    // 3b. Anomaly Detection
    const anomalyResult = await callAnomalyDetection({
      corridor,
      event_cause: category,
      start_datetime,
      predicted_duration_mins: mlResult.duration_mins,
    })
    console.log(
      `[Plan] Anomaly: score=${anomalyResult.anomaly_score}, label=${anomalyResult.anomaly_label}`,
    )

    // 4. Propagation Forecast
    const propagationForecast = runPropagationForecast(
      lat,
      lon,
      mlResult.severity_score,
      mlResult.duration_mins,
    )
    console.log(`[Plan] Propagation forecast computed for T+5, T+15, T+30`)

    // 4b. Congestion Forecast (for recommendations)
    const congestionForecast = simulationService.getCongestionForecast(
      lat,
      lon,
      mlResult.severity_score,
      mlResult.duration_mins,
    )

    // 5. Fleet Recommendation Engine
    const precedents = getHistoricalPrecedents(category)
    const fleetResult = await query(
      `SELECT id, name, current_lat, current_lon FROM users WHERE status = 'available' AND role = 'fleet'`,
    )
    const availableFleet = fleetResult.rows

    const activeEventObj = {
      type,
      category,
      lat,
      lon,
      expected_crowd_size: expected_crowd_size || null,
      duration_mins: mlResult.duration_mins,
      severity_score: mlResult.severity_score,
      affected_corridors: Array.isArray(affected_corridors) ? affected_corridors : [corridor],
      requires_road_closure: requires_road_closure || false,
      confidence: mlResult.confidence,
      prediction_interval: mlResult.prediction_interval,
    }

    const fleetPlan = await generateDispatchPlan({
      event: activeEventObj,
      forecast: congestionForecast,
      precedents,
      availableFleet,
    })
    console.log(`[Plan] Fleet Deployment: ${fleetPlan.total_fleet_required} officers`)

    // 5b. Barrier Recommendation Engine
    const barricadePlan = await generateBarricadePlan({
      event: activeEventObj,
      forecast: congestionForecast,
    })
    console.log(`[Plan] Barricades: ${barricadePlan.barricades.length} recommended`)

    // 5c. Diversion Recommendation Engine — reroute traffic off the at-risk
    // corridor onto a lower-spillover alternate. Avoid corridors already taken
    // by other active events (multi-event aware).
    const competingResult = await query(
      `SELECT affected_corridors FROM events
       WHERE id <> $1 AND status IN ('planned', 'active')`,
      [eventId],
    )
    const competingCorridors = competingResult.rows.flatMap(
      (r: { affected_corridors: string[] | null }) =>
        Array.isArray(r.affected_corridors) ? r.affected_corridors : [],
    )
    const diversionPlan = await generateDiversionPlan({
      event: {
        category,
        lat,
        lon,
        severity_score: mlResult.severity_score,
        risk_level: queueResult.risk_level,
        requires_road_closure: requires_road_closure || false,
        affected_corridors: Array.isArray(affected_corridors) ? affected_corridors : [corridor],
      },
      competingCorridors,
    })
    console.log(`[Plan] Diversions: ${diversionPlan.routes.length} route(s) recommended`)

    // 6. Advisory Gating
    const nearest = graphService.getNearestJunction(lat, lon)
    const neighborEdges = nearest ? graphService.getNeighbors(nearest.id) : []
    const upstreamJunctions = neighborEdges.map((edge) => {
      const j = graphService.junctions.get(edge.target)
      return {
        id: edge.target,
        name: j?.name || edge.target,
        green_time_secs: 60,
      }
    })

    const gatingPlan = await callGating({
      predicted_duration_mins: mlResult.duration_mins,
      corridor,
      event_cause: category,
      hour: eventHour,
      requires_road_closure: requires_road_closure || false,
      upstream_junctions: upstreamJunctions,
    })
    console.log(
      `[Plan] Gating: ${gatingPlan.recommendations.length} signal adjustments recommended`,
    )

    // 7. Pre-staging Timeline
    const prestagingTimeline = buildPrestagingTimeline(
      start_datetime,
      mlResult.duration_mins,
      queueResult.risk_level,
      {
        recommendations: barricadePlan.barricades.map((b) => ({
          junction_name: b.location_name,
          barricades: 1,
        })),
      },
    )

    // 8. Update DB with all pipeline results
    const updateQuery = `
      UPDATE events SET
        predicted_duration_mins = $1,
        duration_mins = $2,
        severity_score = $3,
        blocking_probability = $4,
        risk_level = $5,
        queue_length = $6,
        time_to_spillover = $7,
        deployment_plan = $8,
        gating_plan = $9,
        similar_incidents = $10,
        propagation_forecast = $11,
        prestaging_timeline = $12,
        anomaly_score = $13,
        anomaly_label = $14,
        diversion_plan = $15,
        fingerprint_summary = $16,
        status = 'planned'
      WHERE id = $17
      RETURNING *
    `
    const updateResult = await query(updateQuery, [
      mlResult.duration_mins,
      mlResult.duration_mins,
      mlResult.severity_score,
      queueResult.blocking_probability,
      queueResult.risk_level,
      queueResult.expected_queue_length,
      queueResult.time_to_spillover,
      JSON.stringify(fleetPlan),
      JSON.stringify(gatingPlan),
      JSON.stringify(mlResult.similar_events.slice(0, 5)),
      JSON.stringify(propagationForecast),
      JSON.stringify(prestagingTimeline),
      anomalyResult.anomaly_score,
      anomalyResult.anomaly_label,
      JSON.stringify(diversionPlan),
      JSON.stringify({ aggregated: mlResult.aggregated, meta: mlResult.fingerprint_meta }),
      eventId,
    ])

    await query(
      `UPDATE events SET 
        recommendation_status = 'completed', 
        recommendation_rationale = $1, 
        total_fleet_required = $2,
        barricade_rationale = $3, 
        total_barricades_required = $4 
       WHERE id = $5`,
      [
        fleetPlan.rationale,
        fleetPlan.total_fleet_required,
        barricadePlan.rationale,
        barricadePlan.barricades.length,
        eventId,
      ],
    )

    const plannedEvent = updateResult.rows[0]

    // 8b. Persist Fleet Assignments
    for (const deployment of fleetPlan.deployments) {
      const deployByTime = new Date(Date.now() + deployment.deployByMins * 60000)
      for (const member of deployment.assignedFleet) {
        await query(
          `INSERT INTO fleet_assignments (event_id, user_id, junction_name, role, deploy_by_time, priority, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
          [
            eventId,
            member.user_id,
            deployment.junctionName,
            deployment.role,
            deployByTime,
            deployment.priority,
          ],
        )

        await publishWsEvent('fleet:dispatched', {
          eventId,
          user_id: member.user_id,
          user_name: member.user_name,
          junction: deployment.junctionName,
          role: deployment.role,
          priority: deployment.priority,
          deploy_by_time: deployByTime.toISOString(),
        })
      }
    }

    // 8c. Persist Barricades
    for (const barricade of barricadePlan.barricades) {
      await query(
        `INSERT INTO barricades
           (event_id, junction_id, location_name, lat, lon, type, activate_at, purpose, rule_source, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'recommended')`,
        [
          eventId,
          barricade.junction_id,
          barricade.location_name,
          barricade.lat,
          barricade.lon,
          barricade.type,
          barricade.activate_at,
          barricade.purpose,
          barricade.rule_source,
        ],
      )
    }

    // 9. Schedule propagation simulation (runs on future timestamp)
    await schedulePropagationSafe(
      eventId,
      mlResult.severity_score,
      mlResult.duration_mins,
      lat,
      lon,
    )

    res.status(201).json({
      message: 'Event planned successfully',
      event: plannedEvent,
      pipeline: {
        prediction: {
          duration_mins: mlResult.duration_mins,
          severity_score: mlResult.severity_score,
          severity_label: mlResult.severity_label,
          confidence: mlResult.confidence,
          prediction_interval: mlResult.prediction_interval,
          confidence_factors: mlResult.confidence_factors,
        },
        queue_analysis: queueResult,
        fleet_plan: fleetPlan,
        barricade_plan: barricadePlan,
        gating_plan: gatingPlan,
        diversion_plan: diversionPlan,
        similar_incidents: mlResult.similar_events.slice(0, 5),
        fingerprint_summary: { aggregated: mlResult.aggregated, meta: mlResult.fingerprint_meta },
        propagation_forecast: propagationForecast,
        prestaging_timeline: prestagingTimeline,
        anomaly_detection: anomalyResult,
      },
    })
  } catch (error) {
    console.error('[Plan] Error planning event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const createEvent = async (req: Request, res: Response) => {
  try {
    const {
      type,
      category,
      name,
      description,
      lat,
      lon,
      expected_crowd_size,
      start_datetime,
      expected_end_datetime,
      affected_corridors,
      requires_road_closure,
      veh_type,
      priority,
    } = req.body

    // 1. Insert initial record
    const insertQuery = `
      INSERT INTO events (
        type, category, name, description, lat, lon, expected_crowd_size, 
        start_datetime, expected_end_datetime, affected_corridors, 
        requires_road_closure, veh_type, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'created')
      RETURNING id
    `

    const insertValues = [
      type,
      category,
      name,
      description,
      lat,
      lon,
      expected_crowd_size,
      start_datetime,
      expected_end_datetime,
      affected_corridors,
      requires_road_closure || false,
      veh_type,
      priority,
    ]

    const result = await query(insertQuery, insertValues)
    const eventId = result.rows[0].id

    // 2. Call ML Endpoint
    const mlResults = await callMLPredict(req.body)

    // 3. Update DB with ML Results
    const updateQuery = `
      UPDATE events 
      SET duration_mins = $1, predicted_duration_mins = $1, severity_score = $2, status = 'active'
      WHERE id = $3
      RETURNING *
    `
    const updateResult = await query(updateQuery, [
      mlResults.duration_mins,
      mlResults.severity_score,
      eventId,
    ])

    const activeEvent = updateResult.rows[0]

    // 4. Historical precedents (stand-in for the ML fingerprinting service)
    const precedents = getHistoricalPrecedents(activeEvent.category)

    // 5. Congestion forecast at T+0, T+15, T+30
    const forecast = simulationService.getCongestionForecast(
      activeEvent.lat,
      activeEvent.lon,
      activeEvent.severity_score,
      activeEvent.duration_mins,
    )

    // 6. Available fleet inventory
    const fleetResult = await query(
      `SELECT id, name, current_lat, current_lon FROM users WHERE status = 'available' AND role = 'fleet'`,
    )
    const availableFleet = fleetResult.rows

    // 7. Multi-event conflict check: flag other active events nearby in
    // space and time, since they'll be competing for the same fleet pool.
    const activeEventsResult = await query(
      `SELECT * FROM events WHERE status = 'active' AND id != $1`,
      [eventId],
    )
    const conflicts = findConflicts(activeEvent, activeEventsResult.rows)

    // 7b. Conflict-aware re-allocation: when competing active events share this
    // event's vicinity, divide the fleet pool by severity weight instead of
    // letting this event greedily claim it all.
    const competingEvents = conflicts
      .map((c) => activeEventsResult.rows.find((r) => r.id === c.conflicting_event_id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({ severity_score: r.severity_score, lat: r.lat, lon: r.lon }))

    const { fleet: dispatchFleet, fairCount } = allocateFleetShare(
      { lat: activeEvent.lat, lon: activeEvent.lon, severity_score: activeEvent.severity_score },
      competingEvents,
      availableFleet,
    )

    if (conflicts.length > 0) {
      console.log(
        `[Plan] Conflict re-allocation: claiming ${fairCount}/${availableFleet.length} fleet (severity-weighted) across ${conflicts.length} competing event(s)`,
      )
      await publishWsEvent('event:conflict', {
        eventId,
        eventName: activeEvent.name,
        conflicts,
        fleetReallocation: { claimed: fairCount, pool: availableFleet.length },
      })
    }

    // 8. Generate the dispatch plan (Groq LLM call, with rule-based fallback)
    const plan = await generateDispatchPlan({
      event: {
        ...activeEvent,
        confidence: mlResults.confidence,
        prediction_interval: mlResults.prediction_interval,
      },
      forecast,
      precedents,
      availableFleet: dispatchFleet,
    })

    // 9. Persist the plan and create pending fleet assignments
    const recommendationUpdate = await query(
      `UPDATE events
       SET recommendation_status = 'completed', recommendation_rationale = $1, total_fleet_required = $2
       WHERE id = $3
       RETURNING *`,
      [plan.rationale, plan.total_fleet_required, eventId],
    )
    const eventWithRecommendation = recommendationUpdate.rows[0]

    for (const deployment of plan.deployments) {
      const deployByTime = new Date(Date.now() + deployment.deployByMins * 60000)
      for (const member of deployment.assignedFleet) {
        await query(
          `INSERT INTO fleet_assignments (event_id, user_id, junction_name, role, deploy_by_time, priority, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
          [
            eventId,
            member.user_id,
            deployment.junctionName,
            deployment.role,
            deployByTime,
            deployment.priority,
          ],
        )

        // 10. Notify the specific fleet member's mobile client of their new task
        await publishWsEvent('fleet:dispatched', {
          eventId,
          user_id: member.user_id,
          user_name: member.user_name,
          junction: deployment.junctionName,
          role: deployment.role,
          priority: deployment.priority,
          deploy_by_time: deployByTime.toISOString(),
        })
      }
    }

    // 11. Tell the dashboard the recommendation is ready to display
    await publishWsEvent('recommendations:ready', {
      eventId,
      event: eventWithRecommendation,
      recommendation: plan,
      conflicts,
    })

    // 12. Generate the barricade plan (rule-based placements + Groq explanation)
    const barricadePlan = await generateBarricadePlan({ event: activeEvent, forecast })

    for (const barricade of barricadePlan.barricades) {
      await query(
        `INSERT INTO barricades
           (event_id, junction_id, location_name, lat, lon, type, activate_at, purpose, rule_source, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'recommended')`,
        [
          eventId,
          barricade.junction_id,
          barricade.location_name,
          barricade.lat,
          barricade.lon,
          barricade.type,
          barricade.activate_at,
          barricade.purpose,
          barricade.rule_source,
        ],
      )
    }

    await query(
      `UPDATE events SET barricade_rationale = $1, total_barricades_required = $2 WHERE id = $3`,
      [barricadePlan.rationale, barricadePlan.barricades.length, eventId],
    )

    await publishWsEvent('barricades:ready', {
      eventId,
      barricades: barricadePlan.barricades,
      rationale: barricadePlan.rationale,
    })

    // 13. Schedule Propagation Job
    await schedulePropagationSafe(
      eventId,
      activeEvent.severity_score,
      activeEvent.duration_mins,
      activeEvent.lat,
      activeEvent.lon,
    )

    res.status(201).json({
      message: 'Event created successfully',
      event: {
        ...eventWithRecommendation,
        barricade_rationale: barricadePlan.rationale,
        total_barricades_required: barricadePlan.barricades.length,
      },
      recommendation: plan,
      barricades: barricadePlan.barricades,
      barricade_rationale: barricadePlan.rationale,
      conflicts,
    })
  } catch (error) {
    console.error('Error creating event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { status } = req.query
    let sqlQuery = 'SELECT * FROM events ORDER BY created_at DESC'
    const params: any[] = []

    if (status) {
      sqlQuery = 'SELECT * FROM events WHERE status = $1 ORDER BY created_at DESC'
      params.push(status)
    }

    const result = await query(sqlQuery, params)
    res.json({ events: result.rows })
  } catch (error) {
    console.error('Error fetching events:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await query('SELECT * FROM events WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    res.json({ event: result.rows[0] })
  } catch (error) {
    console.error('Error fetching event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, closed_datetime } = req.body

    const result = await query(
      'UPDATE events SET status = COALESCE($1, status), closed_datetime = COALESCE($2, closed_datetime) WHERE id = $3 RETURNING *',
      [status, closed_datetime, id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const updatedEvent = result.rows[0]

    // If event is closed, remove the propagation job and run counterfactual analysis
    if (status === 'closed') {
      await removePropagationJob(id)
      console.log(`[Close] Event ${id} closed, job removed`)

      // Compute actual duration from start to close time
      const closeTime = closed_datetime ? new Date(closed_datetime) : new Date()
      const startTime = new Date(updatedEvent.start_datetime)
      const actualDurationMins = Math.max(1, (closeTime.getTime() - startTime.getTime()) / 60000)

      // Extract deployment info for counterfactual
      const deployPlan = updatedEvent.deployment_plan || {}
      const gatingPlan = updatedEvent.gating_plan || {}
      const corridor = Array.isArray(updatedEvent.affected_corridors)
        ? updatedEvent.affected_corridors[0]
        : updatedEvent.affected_corridors || ''

      const cfResult = await callCounterfactual({
        event_id: id,
        predicted_duration_mins:
          updatedEvent.predicted_duration_mins || updatedEvent.duration_mins || actualDurationMins,
        actual_duration_mins: actualDurationMins,
        corridor,
        event_cause: updatedEvent.category || '',
        start_datetime: updatedEvent.start_datetime || '',
        officers_deployed: deployPlan.total_officers_deployed || 0,
        barricades_deployed: deployPlan.total_barricades_deployed || 0,
        gating_applied: (gatingPlan.recommendations?.length || 0) > 0,
      })

      if (cfResult) {
        await query('UPDATE events SET counterfactual = $1 WHERE id = $2', [
          JSON.stringify(cfResult),
          id,
        ])
        console.log(
          `[Close] Counterfactual analysis: policy_regret=${cfResult.policy_regret}%, best_alt="${cfResult.best_alternative}"`,
        )

        // Also call accuracy endpoint for post-event learning
        try {
          await fetch(`${ML_BASE}/api/ml/accuracy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_id: id,
              predicted_duration_mins:
                updatedEvent.predicted_duration_mins ||
                updatedEvent.duration_mins ||
                actualDurationMins,
              actual_duration_mins: actualDurationMins,
              predicted_severity_score: updatedEvent.severity_score || 0,
              event_cause: updatedEvent.category || '',
              corridor,
            }),
          })
        } catch {
          console.log('[Close] Accuracy endpoint not reachable — skipping post-event learning.')
        }
      }

      res.json({
        message: 'Event closed successfully',
        event: updatedEvent,
        counterfactual: cfResult,
      })
      return
    }

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent,
    })
  } catch (error) {
    console.error('Error updating event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getEventAssignments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await query(
      `SELECT fa.*, u.name as user_name, u.email as user_email 
       FROM fleet_assignments fa
       JOIN users u ON fa.user_id = u.id
       WHERE fa.event_id = $1
       ORDER BY fa.created_at ASC`,
      [id],
    )
    res.json({ assignments: result.rows })
  } catch (error) {
    console.error('Error fetching event assignments:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateAssignmentStatus = async (req: Request, res: Response) => {
  try {
    const { id: eventId, assignmentId } = req.params
    const { status } = req.body

    const validStatuses = ['pending', 'en_route', 'on_site', 'completed', 'blocked']
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }

    const result = await query(
      `UPDATE fleet_assignments 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND event_id = $3
       RETURNING *`,
      [status, assignmentId, eventId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found for this event' })
    }

    const updatedAssignment = result.rows[0]

    // If status is updated to 'on_site', register the fleet deployment in the simulation
    if (status === 'on_site') {
      const junctionName = updatedAssignment.junction_name
      // Find the junction ID by name
      const nameToJunction = new Map(
        Array.from(graphService.junctions.values()).map((j) => [j.name.toLowerCase(), j]),
      )
      const junction = nameToJunction.get(junctionName.toLowerCase())

      if (junction) {
        const junctionId = junction.id
        const stateKey = `interventions:${eventId}`
        const interventionsStr = await redisConnection.get(stateKey)
        const interventions = interventionsStr
          ? JSON.parse(interventionsStr)
          : { barricades: [], fleetDeployments: [] }

        if (!interventions.fleetDeployments.includes(junctionId)) {
          interventions.fleetDeployments.push(junctionId)
          await redisConnection.set(stateKey, JSON.stringify(interventions))
        }

        // Publish to Redis channel so the worker cache updates
        await redisConnection.publish(
          'gridlock:interventions',
          JSON.stringify({
            event: 'fleet_deployed',
            data: {
              eventId,
              nodeId: junctionId,
            },
          }),
        )

        console.log(
          `[Fleet] Registered fleet deployment at junction ${junctionId} for event ${eventId}`,
        )
      } else {
        console.warn(`[Fleet] Junction named "${junctionName}" not found in graph service`)
      }
    }

    // Broadcast update over WebSockets
    await publishWsEvent('fleet:status_updated', {
      eventId,
      assignmentId,
      status,
      junctionName: updatedAssignment.junction_name,
    })

    res.json({
      message: 'Assignment status updated successfully',
      assignment: updatedAssignment,
    })
  } catch (error) {
    console.error('Error updating assignment status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getEventBarricades = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await query(
      `SELECT b.*, u.name as assigned_user_name
       FROM barricades b
       LEFT JOIN users u ON b.assigned_user_id = u.id
       WHERE b.event_id = $1
       ORDER BY b.created_at ASC`,
      [id],
    )
    res.json({ barricades: result.rows })
  } catch (error) {
    console.error('Error fetching event barricades:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * PUT /api/events/:id/barricades/:barricadeId — controller confirms a
 * recommended barricade. This registers it in the live propagation simulation
 * (so it starts blocking spread) and auto-assigns the nearest available fleet
 * member to physically place and manage it.
 */
export const confirmBarricade = async (req: Request, res: Response) => {
  try {
    const { id: eventId, barricadeId } = req.params

    // 1. Mark the barricade confirmed
    const result = await query(
      `UPDATE barricades
       SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND event_id = $2
       RETURNING *`,
      [barricadeId, eventId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barricade not found for this event' })
    }

    const barricade = result.rows[0]

    // 2. Register the barricade in the simulation so the worker blocks
    //    propagation into this junction (same wiring as fleet on_site).
    const stateKey = `interventions:${eventId}`
    const interventionsStr = await redisConnection.get(stateKey)
    const interventions = interventionsStr
      ? JSON.parse(interventionsStr)
      : { barricades: [], fleetDeployments: [] }

    if (!interventions.barricades.includes(barricade.junction_id)) {
      interventions.barricades.push(barricade.junction_id)
      await redisConnection.set(stateKey, JSON.stringify(interventions))
    }

    await redisConnection.publish(
      'gridlock:interventions',
      JSON.stringify({
        event: 'barricade_deployed',
        data: { eventId, nodeId: barricade.junction_id },
      }),
    )
    console.log(
      `[Barricade] Registered barricade at junction ${barricade.junction_id} for event ${eventId}`,
    )

    // 3. Auto-assign the nearest available fleet member to the barricade
    const fleetResult = await query(
      `SELECT id, name, current_lat, current_lon FROM users WHERE status = 'available' AND role = 'fleet'`,
    )
    const assigned = assignNearestFleet(barricade.lat, barricade.lon, 1, fleetResult.rows)

    let assignedFleet: { user_id: string; user_name: string } | null = null
    if (assigned.length > 0) {
      const member = assigned[0]
      assignedFleet = member
      const deployByTime = new Date()

      await query(
        `INSERT INTO fleet_assignments (event_id, user_id, junction_name, role, deploy_by_time, priority, status)
         VALUES ($1, $2, $3, 'barricade_management', $4, 'High', 'pending')`,
        [eventId, member.user_id, barricade.location_name, deployByTime],
      )
      await query(`UPDATE users SET status = 'dispatched' WHERE id = $1`, [member.user_id])
      await query(`UPDATE barricades SET assigned_user_id = $1 WHERE id = $2`, [
        member.user_id,
        barricadeId,
      ])

      await publishWsEvent('fleet:dispatched', {
        eventId,
        user_id: member.user_id,
        user_name: member.user_name,
        junction: barricade.location_name,
        role: 'barricade_management',
        priority: 'High',
        deploy_by_time: deployByTime.toISOString(),
      })
    } else {
      console.warn(`[Barricade] No available fleet to assign to barricade ${barricadeId}`)
    }

    // 4. Broadcast the confirmation to the dashboard
    await publishWsEvent('barricade:status_updated', {
      eventId,
      barricadeId,
      status: 'confirmed',
      junctionName: barricade.location_name,
      assignedFleet,
    })

    res.json({
      message: 'Barricade confirmed successfully',
      barricade: { ...barricade, status: 'confirmed', assigned_user_id: assignedFleet?.user_id },
      assignedFleet,
    })
  } catch (error) {
    console.error('Error confirming barricade:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
