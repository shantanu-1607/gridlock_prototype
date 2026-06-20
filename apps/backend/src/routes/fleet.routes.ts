import { Router } from 'express'

import {
  assignFleetMember,
  getAvailableFleet,
  getMyAssignments,
  updateMyAssignmentStatus,
} from '../controllers/fleet.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

// Controller-facing routes
router.get('/available', authenticateToken, getAvailableFleet)
router.post('/assign', authenticateToken, assignFleetMember)

// Fleet-facing routes
router.get('/my-assignments', authenticateToken, getMyAssignments)
router.patch('/my-assignments/:id/status', authenticateToken, updateMyAssignmentStatus)

export default router
