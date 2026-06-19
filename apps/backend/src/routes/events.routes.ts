import { Router } from 'express'

import {
  confirmBarricade,
  createEvent,
  getEventAssignments,
  getEventBarricades,
  getEventById,
  getEvents,
  planEvent,
  updateAssignmentStatus,
  updateEvent,
} from '../controllers/events.controller'

const router = Router()

// Core planning pipeline — primary endpoint for proactive event management
router.post('/plan', planEvent)

// Legacy CRUD endpoints
router.post('/', createEvent)
router.get('/', getEvents)
router.get('/:id', getEventById)
router.put('/:id', updateEvent)

// Fleet dispatch and intervention endpoints
router.get('/:id/assignments', getEventAssignments)
router.put('/:id/assignments/:assignmentId', updateAssignmentStatus)

// Barricade recommendation endpoints
router.get('/:id/barricades', getEventBarricades)
router.put('/:id/barricades/:barricadeId', confirmBarricade)

export default router
