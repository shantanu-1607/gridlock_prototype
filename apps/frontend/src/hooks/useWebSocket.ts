import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { PropagationTick } from '../types'

const WS_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`.replace(
  /^http/,
  'ws',
)

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastTick, setLastTick] = useState<PropagationTick | null>(null)
  const [lastFleetLocation, setLastFleetLocation] = useState<any>(null)
  const warnedNodesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    function connect() {
      if (cancelled) return
      if (wsRef.current?.readyState === WebSocket.OPEN) return

      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => setConnected(true)
        ws.onerror = () => {
          /* swallow — onclose will handle reconnect */
        }
        ws.onclose = () => {
          setConnected(false)
          if (!cancelled) reconnectTimer = setTimeout(connect, 5000)
        }
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.event === 'propagation:tick') {
              setLastTick(msg.data)
              const activeNodes = msg.data.activeNodes || {}
              Object.entries(activeNodes).forEach(([nodeId, data]: [string, any]) => {
                if (data.intensity >= 1.0 && !warnedNodesRef.current.has(nodeId)) {
                  warnedNodesRef.current.add(nodeId)
                  toast.error('🚨 Spillover Alert: A junction queue has breached capacity.', {
                    duration: 8000,
                  })
                }
              })
            } else if (msg.event === 'controller:fleet_locations') {
              setLastFleetLocation(msg.data)
            } else if (msg.event === 'fleet:status_updated') {
              const { user_name, junctionName, status } = msg.data
              if (status === 'on_site') {
                toast.success(
                  `${user_name || 'Officer'} is On Site at ${junctionName || 'their location'}`,
                  {
                    description: 'Live Fleet Update',
                    duration: 5000,
                  },
                )
              } else if (status === 'en_route') {
                toast.info(
                  `${user_name || 'Officer'} is En Route to ${junctionName || 'their location'}`,
                  {
                    description: 'Live Fleet Update',
                    duration: 5000,
                  },
                )
              }
            } else if (msg.event === 'event:conflict') {
              toast.warning(`Resource Conflict Detected: ${msg.data.eventName}`, { duration: 6000 })
            } else if (msg.event === 'recommendations:ready') {
              toast.success(`AI Dispatch Plan Ready`, { duration: 5000 })
            } else if (msg.event === 'barricades:ready') {
              toast.success(`AI Barricade Plan Ready`, { duration: 5000 })
            } else if (msg.event === 'fleet:dispatched') {
              toast.info(`${msg.data.user_name || 'Officer'} dispatched to ${msg.data.junction}`, {
                duration: 5000,
              })
            } else if (msg.event === 'barricade:status_updated') {
              if (msg.data.status === 'confirmed') {
                toast.success(`Barricade active at ${msg.data.junctionName}`, { duration: 5000 })
              }
            } else if (msg.event === 'ambient:update') {
              toast(msg.data.message, {
                icon: '✨',
                description: 'Ambient Intel',
                duration: 8000,
              })
            }
          } catch {
            /* ignore parse errors */
          }
        }
      } catch {
        // WebSocket constructor can throw if URL is invalid
        setConnected(false)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      wsRef.current?.close()
    }
  }, [])

  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }))
    }
  }, [])

  return { connected, lastTick, lastFleetLocation, sendMessage }
}
