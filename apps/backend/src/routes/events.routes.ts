import { Router } from 'express'

import { createEvent, getEventById, getEvents, updateEvent } from '../controllers/events.controller'

const router = Router()

// In a real scenario, we'd add RBAC middleware here
// e.g. router.post('/', requireRole('controller'), createEvent);

router.post('/', createEvent)
router.get('/', getEvents)
router.get('/:id', getEventById)
router.put('/:id', updateEvent)

export default router
