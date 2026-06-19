import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
declare global {
  interface Window {
    mappls: any
    MapmyIndia: any
  }
}

interface MapplsMapOptions {
  center?: [number, number]
  zoom?: number
  zoomControl?: boolean
  search?: boolean
}

interface UseMapplsMapReturn {
  mapRef: RefObject<HTMLDivElement | null>
  map: any
  isLoaded: boolean
  error: string | null
  flyTo: (lat: number, lon: number, zoom?: number) => void
  addMarker: (lat: number, lon: number, options?: any) => any
  addCircle: (lat: number, lon: number, radius: number, options?: any) => any
  removeLayer: (layer: any) => void
}

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946]

export function useMapplsMap(options?: MapplsMapOptions): UseMapplsMapReturn {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const center = options?.center || BANGALORE_CENTER
  const zoom = options?.zoom || 12

  useEffect(() => {
    if (!mapRef.current) return
    if (mapInstanceRef.current) return

    const apiKey = import.meta.env.VITE_MAPMYINDIA_API
    if (!apiKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('MapmyIndia API key is missing from environment variables')
      return
    }

    const initMap = () => {
      try {
        if (!window.mappls || !window.mappls.Map) {
          setError('Mappls SDK failed to initialize (window.mappls.Map is missing)')
          return
        }

        if (!mapRef.current!.id) {
          mapRef.current!.id = `mappls-map-${Math.random().toString(36).substring(2, 9)}`
        }

        const map = new window.mappls.Map(mapRef.current!.id, {
          center: [center[0], center[1]],
          zoom,
        })

        map.addListener('load', () => {
          mapInstanceRef.current = map
          setIsLoaded(true)
        })
      } catch (err: any) {
        console.error('Failed to initialize Mappls map:', err)
        setError(`Failed to initialize map: ${err?.message || err}`)
      }
    }

    if (window.mappls) {
      initMap()
    } else {
      // Create script tag dynamically if it doesn't exist
      const scriptId = 'mappls-sdk'
      let script = document.getElementById(scriptId) as HTMLScriptElement

      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.src = `https://sdk.mappls.com/map/sdk/web?v=3.0&access_token=${apiKey}`
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }

      script.addEventListener('load', () => {
        // Even after script load, it takes a moment to mount `window.mappls`
        const interval = setInterval(() => {
          if (window.mappls) {
            clearInterval(interval)
            initMap()
          }
        }, 100)
        setTimeout(() => clearInterval(interval), 5000)
      })

      script.addEventListener('error', () => {
        setError('Failed to load MapmyIndia SDK. Check your API key and network connection.')
      })
    }
  }, [center, zoom, options?.zoomControl, options?.search])

  // Handle resize
  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.resize?.()
        } catch {
          // Some versions don't have resize
        }
      }
    })

    observer.observe(mapRef.current)
    return () => observer.disconnect()
  }, [isLoaded])

  const flyTo = useCallback((lat: number, lon: number, z?: number) => {
    const map = mapInstanceRef.current
    if (!map) return
    map.setCenter({ lat, lng: lon })
    if (z) map.setZoom(z)
  }, [])

  const addMarker = useCallback((lat: number, lon: number, opts?: any) => {
    const map = mapInstanceRef.current
    if (!map || !window.mappls) return null
    return new window.mappls.Marker({
      map,
      position: { lat, lng: lon },
      ...opts,
    })
  }, [])

  const addCircle = useCallback((lat: number, lon: number, radius: number, opts?: any) => {
    const map = mapInstanceRef.current
    if (!map || !window.mappls) return null
    return new window.mappls.Circle({
      map,
      center: { lat, lng: lon },
      radius,
      strokeColor: opts?.strokeColor || '#3b82f6',
      strokeOpacity: opts?.strokeOpacity ?? 0.8,
      strokeWeight: opts?.strokeWeight ?? 2,
      fillColor: opts?.fillColor || '#3b82f6',
      fillOpacity: opts?.fillOpacity ?? 0.2,
      ...opts,
    })
  }, [])

  const removeLayer = useCallback((layer: any) => {
    if (layer && typeof layer.remove === 'function') {
      layer.remove()
    } else if (layer && typeof layer.setMap === 'function') {
      layer.setMap(null)
    }
  }, [])

  // eslint-disable-next-line react-hooks/refs
  return {
    mapRef,
    // eslint-disable-next-line react-hooks/refs
    map: mapInstanceRef.current,
    isLoaded,
    error,
    flyTo,
    addMarker,
    addCircle,
    removeLayer,
  }
}
