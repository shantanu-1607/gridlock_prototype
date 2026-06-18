import './workers/propagation.worker'

import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import http from 'http'
import Redis from 'ioredis'
import { WebSocket, WebSocketServer } from 'ws'

import eventsRoutes from './routes/events.routes'
import graphRoutes from './routes/graph.routes'
import healthRoutes from './routes/health'

dotenv.config()

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

app.use(cors())
app.use(express.json())

app.use('/api/health', healthRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/graph', graphRoutes)

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
  ws.on('message', (message) => {
    console.log(`WS Received: ${message}`)
  })
  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

const PORT = process.env.PORT || 4000

server.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`)
})
