import { Queue } from 'bullmq'
import dotenv from 'dotenv'
import Redis from 'ioredis'

import { simulationService } from './simulation.service'

dotenv.config()

// Create a reused Redis connection for BullMQ
export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
})

// Define our Queue
export const propagationQueue = new Queue('propagation', {
  connection: redisConnection as any,
})

// A separate redis connection dedicated to pub/sub publishing (the
// propagation worker uses its own copy of this same pattern).
const pubSubRedis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379')

/**
 * Publishes an event onto the shared `gridlock:events` Redis channel, which
 * the API server's WebSocket layer (src/index.ts) forwards verbatim to every
 * connected client.
 */
export const publishWsEvent = async (event: string, data: unknown) => {
  await pubSubRedis.publish('gridlock:events', JSON.stringify({ event, data }))
}

/**
 * Schedule the propagation job for an event.
 * Runs every 30 seconds to simulate congestion ticks.
 */
export const schedulePropagationJob = async (
  eventId: string,
  initialSeverity: number,
  durationMins: number,
  lat: number,
  lon: number,
) => {
  console.log(`[Queue] Scheduling propagation job for event ${eventId} at ${lat}, ${lon}`)

  // Initialize the Redis state with the nearest junction as the seed_node
  const stateKey = `propagation_state:${eventId}`
  const existingState = await redisConnection.get(stateKey)
  if (!existingState) {
    const initialState = simulationService.initializeState(lat, lon, initialSeverity)
    await redisConnection.set(stateKey, JSON.stringify(initialState))
  }

  await propagationQueue.add(
    `propagation-job:${eventId}`,
    {
      eventId,
      initialSeverity,
      durationMins,
      lat,
      lon,
    },
    {
      jobId: `propagation-${eventId}`, // Ensure unique job per event
      repeat: {
        every: 30000, // 30 seconds
        // limit: 100 // Optional: limit ticks if needed
      },
    },
  )
}

/**
 * Removes the recurring job when an event is closed
 */
export const removePropagationJob = async (eventId: string) => {
  const jobName = `propagation-job:${eventId}`
  const repeatableJobs = await propagationQueue.getRepeatableJobs()

  const jobToRemove = repeatableJobs.find((job) => job.name === jobName)
  if (jobToRemove) {
    await propagationQueue.removeRepeatableByKey(jobToRemove.key)
    console.log(`[Queue] Removed propagation job for event ${eventId}`)
  }
}
