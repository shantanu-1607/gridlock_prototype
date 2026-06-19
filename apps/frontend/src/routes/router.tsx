/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'

import ControllerLogin from '../components/auth/ControllerLogin'
import FleetLogin from '../components/auth/FleetLogin'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import FleetDashboard from '../components/dashboard/FleetDashboard'
import LandingPage from '../components/LandingPage'
import { useAuth } from '../hooks/useAuth'

/**
 * Route guard that checks for a valid session via useAuth.
 * Optionally restricts to a specific role.
 */
function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole?: 'controller' | 'fleet'
}) {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to={role === 'controller' ? '/dashboard' : '/fleet'} replace />
  }

  return <>{children}</>
}

/**
 * Redirect authenticated users away from login/landing pages.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth()

  if (isAuthenticated) {
    return <Navigate to={role === 'controller' ? '/dashboard' : '/fleet'} replace />
  }

  return <>{children}</>
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <PublicRoute>
        <LandingPage />
      </PublicRoute>
    ),
  },
  {
    path: '/login/controller',
    element: (
      <PublicRoute>
        <ControllerLogin />
      </PublicRoute>
    ),
  },
  {
    path: '/login/fleet',
    element: (
      <PublicRoute>
        <FleetLogin />
      </PublicRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute requiredRole="controller">
        <DashboardLayout />
      </ProtectedRoute>
    ),
  },
  {
    path: '/fleet',
    element: (
      <ProtectedRoute requiredRole="fleet">
        <FleetDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]
