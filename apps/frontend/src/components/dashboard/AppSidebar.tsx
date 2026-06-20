import {
  FileBarChart,
  Gauge,
  History,
  Map,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard/map', label: 'Live Map', icon: Map },
  { to: '/dashboard/overview', label: 'Overview', icon: Gauge },
  { to: '/dashboard/performance', label: 'Performance Metrics', icon: SlidersHorizontal },
  { to: '/dashboard/reports', label: 'Detailed Reports', icon: FileBarChart },
  { to: '/dashboard/history', label: 'Event History', icon: History },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
] as const

interface AppSidebarProps {
  chatOpen: boolean
  onChatToggle: () => void
}

export default function AppSidebar({ chatOpen, onChatToggle }: AppSidebarProps) {
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

      {/* AI Assistant Button at the bottom */}
      <div className="mt-auto pt-4">
        <button
          onClick={onChatToggle}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 relative group overflow-hidden border border-primary/20',
            chatOpen
              ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]'
              : 'bg-primary/5 text-primary hover:bg-primary/10 shadow-[0_0_8px_rgba(59,130,246,0.2)] hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]',
          )}
        >
          {/* Glowing back-light effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md pointer-events-none" />

          <Sparkles
            className={cn(
              'w-5 h-5 shrink-0 transition-transform duration-500 group-hover:rotate-12',
              chatOpen ? 'text-white' : 'text-blue-500',
            )}
          />
          <span>AI Assistant</span>

          {/* Subtle outer pulse when not open to attract attention */}
          {!chatOpen && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
        </button>
      </div>
    </nav>
  )
}
