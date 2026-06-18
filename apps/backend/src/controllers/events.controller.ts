import { Request, Response } from 'express';
import { query } from '../utils/db';
import { schedulePropagationJob, removePropagationJob } from '../services/queue.service';

/**
 * Helper to simulate ML prediction call.
 * This is a stub until the Python FastAPI endpoint is ready.
 */
async function callMLPredict(eventData: any) {
  try {
    const mlUrl = `${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/api/ml/predict`;
    const response = await fetch(mlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (response.ok) {
      const data = await response.json();
      return {
        duration_mins: data.predicted_duration_mins,
        severity_score: data.severity_score
      };
    }
  } catch (error) {
    console.log('[ML] Endpoint not reachable, using stubbed values.');
  }

  // Stub values
  return {
    duration_mins: 87,
    severity_score: 0.8
  };
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
      priority
    } = req.body;

    // 1. Insert initial record
    const insertQuery = `
      INSERT INTO events (
        type, category, name, description, lat, lon, expected_crowd_size, 
        start_datetime, expected_end_datetime, affected_corridors, 
        requires_road_closure, veh_type, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'created')
      RETURNING id
    `;

    const insertValues = [
      type, category, name, description, lat, lon, expected_crowd_size,
      start_datetime, expected_end_datetime, affected_corridors,
      requires_road_closure || false, veh_type, priority
    ];

    const result = await query(insertQuery, insertValues);
    const eventId = result.rows[0].id;

    // 2. Call ML Endpoint
    const mlResults = await callMLPredict(req.body);

    // 3. Update DB with ML Results
    const updateQuery = `
      UPDATE events 
      SET duration_mins = $1, severity_score = $2, status = 'active'
      WHERE id = $3
      RETURNING *
    `;
    const updateResult = await query(updateQuery, [
      mlResults.duration_mins,
      mlResults.severity_score,
      eventId
    ]);

    const activeEvent = updateResult.rows[0];

    // 4. Schedule Propagation Job
    await schedulePropagationJob(eventId, activeEvent.severity_score, activeEvent.lat, activeEvent.lon);

    res.status(201).json({
      message: 'Event created successfully',
      event: activeEvent
    });

  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    let sqlQuery = 'SELECT * FROM events ORDER BY created_at DESC';
    const params: any[] = [];

    if (status) {
      sqlQuery = 'SELECT * FROM events WHERE status = $1 ORDER BY created_at DESC';
      params.push(status);
    }

    const result = await query(sqlQuery, params);
    res.json({ events: result.rows });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM events WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event: result.rows[0] });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, closed_datetime } = req.body;

    const result = await query(
      'UPDATE events SET status = COALESCE($1, status), closed_datetime = COALESCE($2, closed_datetime) WHERE id = $3 RETURNING *',
      [status, closed_datetime, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // If event is closed, remove the job
    if (status === 'closed') {
      await removePropagationJob(id);
      console.log(`event ${id} closed and job removed`);
    }

    res.json({
      message: 'Event updated successfully',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
