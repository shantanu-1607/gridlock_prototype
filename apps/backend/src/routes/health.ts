import { Router } from 'express'

import { getHealthStatus, getMlStats } from '../controllers/health.controller'

const router = Router()

router.get('/', getHealthStatus)
router.get('/ml-stats', getMlStats)

export default router
