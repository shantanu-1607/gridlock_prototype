/* eslint-disable no-undef */
/* eslint-disable no-console */
import type { PipelineResult, PlanEventPayload, PlannedEvent } from '../types'
import type { LoginCredentials, User, UserRole } from '../types/auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gridlock_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Wrapper for standard fetch that intercepts 401s and attempts a token refresh
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let headers = getAuthHeaders()

  if (options.headers) {
    headers = { ...headers, ...(options.headers as Record<string, string>) }
  }

  let res = await fetch(url, { ...options, headers })

  if (res.status === 401) {
    const refreshToken = localStorage.getItem('gridlock_refresh_token')
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: refreshToken }),
        })

        if (refreshRes.ok) {
          const data = await refreshRes.json()
          localStorage.setItem('gridlock_token', data.token)
          if (data.refreshToken) localStorage.setItem('gridlock_refresh_token', data.refreshToken)

          // Retry the original request with new token
          headers['Authorization'] = `Bearer ${data.token}`
          res = await fetch(url, { ...options, headers })
        } else {
          // Refresh failed, clear session
          localStorage.removeItem('gridlock_token')
          localStorage.removeItem('gridlock_refresh_token')
          window.location.href = '/'
        }
      } catch (err) {
        console.error('Failed to refresh token', err)
      }
    } else {
      // No refresh token, clear session
      localStorage.removeItem('gridlock_token')
      window.location.href = '/'
    }
  }

  return res
}

export async function login(
  credentials: LoginCredentials,
): Promise<{ user: User; token: string; refreshToken?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    })
    if (res.ok) {
      const data = await res.json()
      return { user: data.user, token: data.token, refreshToken: data.refreshToken }
    }
    if (res.status === 404) {
      return mockLogin(credentials)
    }

    if (res.status === 401) {
      throw new Error('Invalid email or password')
    }
    throw new Error(`Login failed: ${res.statusText}`)
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return mockLogin(credentials)
    }
    throw err
  }
}

function mockLogin(credentials: LoginCredentials): {
  user: User
  token: string
  refreshToken?: string
} {
  const { email, password } = credentials

  if (email === 'controller@gridlock.in' && password === 'gridlock') {
    return createMockAuth('controller', email, 'Traffic Controller')
  }
  if (email === 'fleet@gridlock.in' && password === 'gridlock') {
    return createMockAuth('fleet', email, 'Fleet Officer')
  }
  throw new Error(
    'Invalid credentials. Use controller@gridlock.in or fleet@gridlock.in with password "gridlock"',
  )
}

function createMockAuth(
  role: UserRole,
  email: string,
  name: string,
): { user: User; token: string; refreshToken: string } {
  const payload = { email, role, name, exp: Math.floor(Date.now() / 1000) + 15 * 60 } // 15 mins
  const token = `mock.${btoa(JSON.stringify(payload))}.signature`
  const refreshPayload = { exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 } // 7 days
  const refreshToken = `mock.${btoa(JSON.stringify(refreshPayload))}.signature`
  return { user: { email, role, name }, token, refreshToken }
}

export function parseToken(token: string): User | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(atob(parts[1]))
    // Standard JWT exp is in seconds! Date.now() is ms.
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token is expired. We STILL return the user object so AuthContext doesn't immediately
      // wipe the state, letting fetchWithAuth interceptor handle the refresh!
    }
    return { email: payload.email, role: payload.role, name: payload.name }
  } catch {
    return null
  }
}

export async function planEvent(payload: PlanEventPayload): Promise<{
  event: PlannedEvent
  pipeline: PipelineResult
}> {
  const res = await fetchWithAuth(`${API_BASE}/api/events/plan`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Plan failed: ${res.statusText}`)
  const data = await res.json()
  return { event: data.event, pipeline: data.pipeline }
}

export async function getEvents(status?: string): Promise<PlannedEvent[]> {
  const url = status ? `${API_BASE}/api/events?status=${status}` : `${API_BASE}/api/events`
  const res = await fetchWithAuth(url)
  if (!res.ok) throw new Error(`Fetch events failed: ${res.statusText}`)
  const data = await res.json()
  return data.events
}

export async function closeEvent(id: string): Promise<{ message: string; event: PlannedEvent }> {
  const res = await fetchWithAuth(`${API_BASE}/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'closed',
      closed_datetime: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(`Close failed: ${res.statusText}`)
  return res.json()
}
export async function getEventAssignments(id: string): Promise<any[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/events/${id}/assignments`)
  if (!res.ok) throw new Error(`Fetch assignments failed: ${res.statusText}`)
  const data = await res.json()
  return data.assignments
}

export async function getEventBarricades(id: string): Promise<any[]> {
  const res = await fetchWithAuth(`${API_BASE}/api/events/${id}/barricades`)
  if (!res.ok) throw new Error(`Fetch barricades failed: ${res.statusText}`)
  const data = await res.json()
  return data.barricades
}

export function createWebSocket(): WebSocket {
  const wsUrl = API_BASE.replace(/^http/, 'ws')
  return new WebSocket(wsUrl)
}
