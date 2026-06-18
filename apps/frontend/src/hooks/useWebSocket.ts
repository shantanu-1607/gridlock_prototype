import { useCallback, useEffect, useRef, useState } from 'react'

import type { PropagationTick } from '../types'

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/^http/, 'ws')

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastTick, setLastTick] = useState<PropagationTick | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
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
        reconnectTimer.current = setTimeout(connect, 5000)
      }
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.event === 'propagation:tick') {
            setLastTick(msg.data)
          }
        } catch {
          /* ignore parse errors */
        }
      }
    } catch {
      // WebSocket constructor can throw if URL is invalid
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { connected, lastTick }
}
