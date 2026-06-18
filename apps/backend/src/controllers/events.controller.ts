import { Request, Response } from 'express'

import { removePropagationJob, schedulePropagationJob } from '../services/queue.service'
import { generateDispatchPlan, getHistoricalPrecedents } from '../services/recommendation.service'
import { simulationService } from '../services/simulation.service'
import { query } from '../utils/db'

/**
 * Helper to simulate ML prediction call.
 * This is a stub until the Python FastAPI endpoint is ready.
 */
async function callMLPredict(eventData: any) {
  try {
    const mlUrl = `${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/api/ml/predict`
    const response = await fetch(mlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    })
    if (response.ok) {
      const data = await response.json()
      return {
        duration_mins: data.predicted_duration_mins,
        severity_score: data.severity_score,
      }
    }
  } catch (error) {
    console.log('[ML] Endpoint not reachable, using stubbed values.')
  }

  // Stub values
  return {
    duration_mins: 87,
    severity_score: 0.8,
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
      SET duration_mins = $1, severity_score = $2, status = 'active'
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
    )

    // 6. Available fleet inventory
    const fleetResult = await query(
      `SELECT id, name, current_lat, current_lon FROM users WHERE status = 'available' AND role = 'fleet'`,
    )
    const availableFleet = fleetResult.rows

    // 7. Generate the dispatch plan (Groq LLM call, with rule-based fallback)
    const plan = await generateDispatchPlan({
      event: activeEvent,
      forecast,
      precedents,
      availableFleet,
    })

    // 8. Persist the plan and create pending fleet assignments
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
      }
    }

    // 9. Schedule Propagation Job
    await schedulePropagationJob(
      eventId,
      activeEvent.severity_score,
      activeEvent.lat,
      activeEvent.lon,
    )

    res.status(201).json({
      message: 'Event created successfully',
      event: eventWithRecommendation,
      recommendation: plan,
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

    // If event is closed, remove the job
    if (status === 'closed') {
      await removePropagationJob(id)
      console.log(`event ${id} closed and job removed`)
    }

    res.json({
      message: 'Event updated successfully',
      event: result.rows[0],
    })
  } catch (error) {
    console.error('Error updating event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
