export type UserRole = 'controller' | 'fleet'

export interface User {
  email: string
  role: UserRole
  name: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}
