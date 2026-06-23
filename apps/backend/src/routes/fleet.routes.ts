import { Router } from 'express'

import {
  acceptOrderViaToken,
  assignFleetMember,
  getAvailableFleet,
  getMyAssignments,
  updateMyAssignmentStatus,
} from '../controllers/fleet.controller'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

// ─── Public route: WhatsApp deep-link accept handler ──────────────────────────
// No auth middleware — the signed JWT in the query param IS the auth.
router.get('/accept-order', acceptOrderViaToken)

// Controller-facing routes
router.get('/available', authenticateToken, getAvailableFleet)
router.post('/assign', authenticateToken, assignFleetMember)

// Fleet-facing routes
router.get('/my-assignments', authenticateToken, getMyAssignments)
router.patch('/my-assignments/:id/status', authenticateToken, updateMyAssignmentStatus)

export default router
