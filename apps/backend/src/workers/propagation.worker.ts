import { Worker } from 'bullmq'
import dotenv from 'dotenv'
import Redis from 'ioredis'

import { Interventions, PropagationState, simulationService } from '../services/simulation.service'

dotenv.config()

const workerRedis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
})

// A separate redis connection specifically for pub/sub publishing
const pubSubRedis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379')

export const propagationWorker = new Worker(
  'propagation',
  async (job) => {
    const { eventId, initialSeverity, lat, lon } = job.data
    const stateKey = `propagation_state:${eventId}`

    // Fetch state from Redis
    const stateStr = await workerRedis.get(stateKey)
    let state: PropagationState

    if (!stateStr) {
      // First run for this event
      console.log(`[Worker] Initializing propagation state for event ${eventId}`)
      state = simulationService.initializeState(lat, lon, initialSeverity)
    } else {
      state = JSON.parse(stateStr)
    }

    console.log(`[Worker] Processing propagation tick ${state.currentTick} for event ${eventId}`)

    // Fetch interventions (Mocking empty for now, would typically fetch from Redis/DB)
    // Here we can fetch from a known key like `interventions:${eventId}`
    const interventionsStr = await workerRedis.get(`interventions:${eventId}`)
    const interventions: Interventions = interventionsStr
      ? JSON.parse(interventionsStr)
      : { barricades: [], fleetDeployments: [] }

    // Run the tick algorithm
    state = simulationService.tick(state, interventions)

    // Save updated state back to Redis
    await workerRedis.set(stateKey, JSON.stringify(state))

    // Publish to Redis channel so WebSocket server can broadcast
    const payload = JSON.stringify({
      event: 'propagation:tick',
      data: {
        eventId,
        tick: state.currentTick,
        activeNodes: state.activeNodes,
        timestamp: new Date().toISOString(),
      },
    })

    await pubSubRedis.publish('gridlock:events', payload)

    return {
      success: true,
      tick: state.currentTick,
      activeNodesCount: Object.keys(state.activeNodes).length,
    }
  },
  { connection: workerRedis as any },
)

propagationWorker.on('completed', (job) => {
  // console.log(`Job ${job.id} has completed!`);
})

propagationWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`)
})
