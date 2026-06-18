import { Router } from 'express'

import { graphService } from '../services/graph.service'

const router = Router()

// Endpoint to fetch all junctions (nodes)
router.get('/junctions', (req, res) => {
  const junctions = Array.from(graphService.junctions.values())
  res.json({ junctions })
})

// Endpoint to fetch all road connections (edges)
router.get('/edges', (req, res) => {
  const edges = []
  for (const list of graphService.adjacencyList.values()) {
    edges.push(...list)
  }
  res.json({ edges })
})

export default router
