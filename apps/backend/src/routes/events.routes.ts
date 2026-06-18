import { Router } from 'express'

import {
  createEvent,
  getEventById,
  getEvents,
  planEvent,
  updateEvent,
} from '../controllers/events.controller'
import { createEvent, getEventById, getEvents, updateEvent } from '../controllers/events.controller'

const router = Router()

// Core planning pipeline — primary endpoint for proactive event management
router.post('/plan', planEvent)

// Legacy CRUD endpoints
router.post('/', createEvent)
router.get('/', getEvents)
router.get('/:id', getEventById)
router.put('/:id', updateEvent)

export default router
