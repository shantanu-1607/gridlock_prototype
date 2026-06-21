import { Response } from 'express'

import { AuthRequest } from '../middleware/auth.middleware'
import { publishWsEvent } from '../services/queue.service'
import { query } from '../utils/db'

export const getAvailableFleet = async (req: AuthRequest, res: Response) => {
  try {
    const { specialty } = req.query
    let sql = `SELECT id, name, email, current_lat, current_lon, specialty, status FROM users WHERE role = 'fleet' AND status = 'available'`
    const params: any[] = []

    if (specialty) {
      sql += ` AND specialty = $1`
      params.push(specialty)
    }

    const result = await query(sql, params)
    return res.status(200).json({ fleet: result.rows })
  } catch (error) {
    console.error('Error fetching available fleet:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const assignFleetMember = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, userId, junctionName, role, priority } = req.body

    // Default 30 mins
    const deployByTime = new Date(Date.now() + 30 * 60000)

    const insertResult = await query(
      `INSERT INTO fleet_assignments (event_id, user_id, junction_name, role, deploy_by_time, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [eventId, userId, junctionName, role, deployByTime, priority],
    )

    const assignment = insertResult.rows[0]

    // Update user status to dispatched
    await query(`UPDATE users SET status = 'dispatched' WHERE id = $1`, [userId])

    // Fetch user details for WS event
    const userResult = await query(`SELECT name FROM users WHERE id = $1`, [userId])
    const userName = userResult.rows[0]?.name

    await publishWsEvent('fleet:dispatched', {
      eventId,
      user_id: userId,
      user_name: userName,
      junction: junctionName,
      role,
      priority,
      deploy_by_time: deployByTime.toISOString(),
      assignment_id: assignment.id,
    })

    return res.status(201).json({ message: 'Fleet assigned successfully', assignment })
  } catch (error) {
    console.error('Error assigning fleet member:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const getMyAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const result = await query(
      `SELECT fa.*, e.name as event_name, e.lat as event_lat, e.lon as event_lon 
       FROM fleet_assignments fa
       JOIN events e ON fa.event_id = e.id
       WHERE fa.user_id = $1
       ORDER BY 
         CASE fa.priority 
           WHEN 'Critical' THEN 1 
           WHEN 'High' THEN 2 
           WHEN 'Medium' THEN 3 
           WHEN 'Low' THEN 4 
           ELSE 5 
         END ASC,
         fa.created_at ASC`,
      [userId],
    )
    return res.status(200).json({ assignments: result.rows })
  } catch (error) {
    console.error('Error fetching my assignments:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export const updateMyAssignmentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { id } = req.params
    const { status } = req.body

    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const updateResult = await query(
      `UPDATE fleet_assignments 
       SET status = $1 
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, id, userId],
    )

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Assignment not found or unauthorized' })
    }

    // Update user status
    const userStatus =
      status === 'en_route' ? 'dispatched' : status === 'on_site' ? 'on_site' : 'available'
    await query(`UPDATE users SET status = $1 WHERE id = $2`, [userStatus, userId])

    const userResult = await query(`SELECT name FROM users WHERE id = $1`, [userId])
    const userName = userResult.rows[0]?.name || 'Officer'

    // Broadcast status update
    await publishWsEvent('fleet:status_updated', {
      assignment_id: id,
      user_id: userId,
      user_name: userName,
      junctionName: updateResult.rows[0]?.junction_name,
      status,
    })

    return res.status(200).json({ message: 'Status updated', assignment: updateResult.rows[0] })
  } catch (error) {
    console.error('Error updating assignment status:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
