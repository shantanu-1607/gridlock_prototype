import './workers/propagation.worker'

import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import http from 'http'
import Redis from 'ioredis'
import { WebSocket, WebSocketServer } from 'ws'

import authRoutes from './routes/auth.routes'
import chatRoutes from './routes/chat.routes'
import eventsRoutes from './routes/events.routes'
import fleetRoutes from './routes/fleet.routes'
import graphRoutes from './routes/graph.routes'
import healthRoutes from './routes/health'
import mapRoutes from './routes/map.routes'

dotenv.config()

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/graph', graphRoutes)
app.use('/api/map', mapRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/fleet', fleetRoutes)

const subscriberRedis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379')
subscriberRedis.subscribe('gridlock:events', (err, count) => {
  if (err) {
    console.error('Failed to subscribe to Redis channel', err)
  } else {
    console.log(`Subscribed to ${count} Redis channels.`)
  }
})

subscriberRedis.on('message', (channel, message) => {
  if (channel === 'gridlock:events') {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }
})

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected')
  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message.toString())
      if (parsed.type === 'fleet:location_update') {
        const { publishWsEvent } = await import('./services/queue.service')
        await publishWsEvent('controller:fleet_locations', parsed.payload)
      } else {
        console.log(`WS Received: ${message}`)
      }
    } catch (e) {
      console.log(`WS Received raw: ${message}`)
    }
  })
  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`)
})
