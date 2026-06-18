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

// A redis connection for pub/sub subscribing to update cached state
const subscriberRedis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379')
const interventionCache: Record<string, Interventions> = {}

subscriberRedis.subscribe('gridlock:interventions', (err) => {
  if (err) console.error('[Worker] Failed to subscribe to interventions', err)
})

subscriberRedis.on('message', (channel, message) => {
  if (channel === 'gridlock:interventions') {
    try {
      const data = JSON.parse(message)
      const eventId = data.data?.eventId
      if (!eventId) return

      if (!interventionCache[eventId]) {
        interventionCache[eventId] = { barricades: [], fleetDeployments: [] }
      }

      if (data.event === 'barricade_deployed') {
        interventionCache[eventId].barricades.push(data.data.nodeId)
        console.log(`[Worker Cache] Cached barricade for event ${eventId} at ${data.data.nodeId}`)
      } else if (data.event === 'fleet_deployed') {
        interventionCache[eventId].fleetDeployments.push(data.data.nodeId)
        console.log(`[Worker Cache] Cached fleet for event ${eventId} at ${data.data.nodeId}`)
      }
    } catch (e) {
      console.error('[Worker] Error processing pub/sub message', e)
    }
  }
})

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

    // Fetch interventions using cache first, then Redis
    let interventions = interventionCache[eventId]
    if (!interventions) {
      const interventionsStr = await workerRedis.get(`interventions:${eventId}`)
      interventions = interventionsStr
        ? JSON.parse(interventionsStr)
        : { barricades: [], fleetDeployments: [] }
      interventionCache[eventId] = interventions
    }

    // Determine current timeOfDay
    const currentHour = new Date().getHours()
    const timeOfDay = `${currentHour}:00`

    // Multi-event merging: Fetch other active nodes
    const allKeys = await workerRedis.keys('propagation_state:*')
    const otherActiveNodes: string[] = []
    for (const key of allKeys) {
      if (key !== stateKey) {
        const otherStateStr = await workerRedis.get(key)
        if (otherStateStr) {
          const otherState: PropagationState = JSON.parse(otherStateStr)
          otherActiveNodes.push(...Object.keys(otherState.activeNodes))
        }
      }
    }

    // Run the tick algorithm
    state = simulationService.tick(state, interventions, timeOfDay, otherActiveNodes)

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
