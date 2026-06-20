import { Request, Response } from 'express'

import { ChatMessage, generateChatResponse } from '../services/chat.service'
import { query } from '../utils/db'

export const handleChatQuery = async (req: Request, res: Response) => {
  try {
    const { history } = req.body as { history: ChatMessage[] }
    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: 'Valid chat history is required.' })
    }

    // Gather context
    const eventsResult = await query(
      `SELECT * FROM events WHERE status IN ('planned', 'active') ORDER BY created_at DESC LIMIT 10`,
      [],
    )
    const fleetResult = await query(
      `SELECT * FROM fleet_assignments WHERE status != 'completed'`,
      [],
    )
    const barricadesResult = await query(`SELECT * FROM barricades WHERE status = 'active'`, [])

    const context = {
      activeEvents: eventsResult.rows.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        severity: e.severity,
        status: e.status,
      })),
      fleetDeployments: fleetResult.rows.map((f) => ({
        id: f.id,
        event_id: f.event_id,
        dispatch_type: f.dispatch_type,
        status: f.status,
      })),
      barricades: barricadesResult.rows.map((b) => ({
        id: b.id,
        location: b.location_name,
        type: b.type,
        status: b.status,
      })),
    }

    const responseText = await generateChatResponse(history, context)

    res.status(200).json({ response: responseText })
  } catch (error) {
    console.error('[Chat Controller] Error processing chat query:', error)
    res.status(500).json({ error: 'Internal server error while processing chat query.' })
  }
}
