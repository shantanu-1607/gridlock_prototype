import { Request, Response } from 'express'

import { graphService } from '../services/graph.service'

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:8000'

export const getHealthStatus = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'GridLock Backend API is healthy',
    timestamp: new Date().toISOString(),
  })
}

/**
 * Public, unauthenticated stats for the landing page. Best-effort proxy of the ML
 * service health — returns the live fingerprint corpus size with a safe fallback so
 * the landing page renders even if the ML service is unreachable.
 */
export const getMlStats = async (_req: Request, res: Response) => {
  // Junction count is a backend-local constant (the loaded road graph), always available.
  const junctionCount = graphService.junctions.size
  try {
    const response = await fetch(`${ML_BASE}/api/ml/health`)
    if (response.ok) {
      const data = (await response.json()) as { fingerprint_corpus_size?: number }
      return res.status(200).json({
        fingerprint_corpus_size: data.fingerprint_corpus_size ?? null,
        junction_count: junctionCount,
      })
    }
  } catch {
    // ML service unreachable — still return the locally-known junction count.
  }
  res.status(200).json({ fingerprint_corpus_size: null, junction_count: junctionCount })
}
