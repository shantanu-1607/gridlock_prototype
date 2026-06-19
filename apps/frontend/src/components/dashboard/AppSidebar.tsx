import { FileBarChart, Gauge, Map, Settings, SlidersHorizontal } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard/map', label: 'Live Map', icon: Map },
  { to: '/dashboard/overview', label: 'Overview', icon: Gauge },
  { to: '/dashboard/performance', label: 'Performance Metrics', icon: SlidersHorizontal },
  { to: '/dashboard/reports', label: 'Detailed Reports', icon: FileBarChart },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
] as const

export default function AppSidebar() {
  return (
    <nav className="flex h-full w-[220px] shrink-0 flex-col gap-1 border-r border-border bg-card px-3 py-4">
      <span className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Navigation
      </span>

      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )
          }
        >
          <Icon size={18} className="shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
