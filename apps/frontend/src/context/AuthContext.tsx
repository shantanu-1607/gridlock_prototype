/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useCallback, useEffect, useState } from 'react'

import type { AuthState, LoginCredentials, User, UserRole } from '../types/auth'
import { login as apiLogin, parseToken } from '../utils/api'

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  role: UserRole | null
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  role: null,
  login: async () => {},
  logout: () => {},
})

const TOKEN_KEY = 'gridlock_token'
const REFRESH_TOKEN_KEY = 'gridlock_refresh_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  // Restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      const parsed = parseToken(stored)
      // Check if it's expired or valid. If expired, api.ts fetchWithAuth will handle refresh!
      if (parsed) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToken(stored)

        setUser(parsed)
      } else {
        // We only clear if completely invalid. If expired, we keep it so fetchWithAuth can try to refresh it
        const parts = stored.split('.')
        if (parts.length < 2) {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(REFRESH_TOKEN_KEY)
        }
      }
    }

    setIsInitializing(false)
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    // apiLogin should return { user, token, refreshToken }
    const result = await apiLogin(credentials)
    localStorage.setItem(TOKEN_KEY, result.token)
    if (result.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken)
    }
    setToken(result.token)
    setUser(result.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        role: user?.role ?? null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
