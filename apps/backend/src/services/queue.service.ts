import { Queue } from 'bullmq'
import dotenv from 'dotenv'
import Redis from 'ioredis'

dotenv.config()

// Create a reused Redis connection for BullMQ
export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
})

// Define our Queue
export const propagationQueue = new Queue('propagation', {
  connection: redisConnection as any,
})

/**
 * Schedule the propagation job for an event.
 * Runs every 30 seconds to simulate congestion ticks.
 */
export const schedulePropagationJob = async (
  eventId: string,
  initialSeverity: number,
  lat: number,
  lon: number,
) => {
  console.log(`[Queue] Scheduling propagation job for event ${eventId} at ${lat}, ${lon}`)

  await propagationQueue.add(
    `propagation-job:${eventId}`,
    {
      eventId,
      initialSeverity,
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
