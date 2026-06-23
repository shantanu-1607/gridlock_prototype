import {
  FileBarChart,
  Gauge,
  History,
  Map,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'

import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard/map', labelKey: 'navItems.liveMap', icon: Map },
  { to: '/dashboard/overview', labelKey: 'navItems.overview', icon: Gauge },
  { to: '/dashboard/performance', labelKey: 'navItems.performance', icon: SlidersHorizontal },
  { to: '/dashboard/reports', labelKey: 'navItems.reports', icon: FileBarChart },
  { to: '/dashboard/history', labelKey: 'navItems.history', icon: History },
  { to: '/dashboard/settings', labelKey: 'navItems.settings', icon: Settings },
] as const

interface MobileNavProps {
  chatOpen: boolean
  onChatToggle: () => void
}

export default function MobileNav({ chatOpen, onChatToggle }: MobileNavProps) {
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card/95 pb-safe backdrop-blur-md md:hidden">
      {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => {
        const isActive = location.pathname === to
        return (
          <NavLink
            key={to}
            to={to}
            className={cn(
              'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={20} className={cn(isActive ? 'stroke-[2.5px]' : 'stroke-2')} />
            <span className="text-[9px] font-medium tracking-tight truncate w-full text-center px-1">
              {t(labelKey)}
            </span>
          </NavLink>
        )
      })}

      {/* AI Assistant Button */}
      <button
        onClick={onChatToggle}
        className={cn(
          'relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200',
          chatOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <div className="relative">
          <Sparkles
            size={20}
            className={cn(
              'transition-transform duration-300',
              chatOpen ? 'stroke-[2.5px] rotate-12' : 'stroke-2',
            )}
          />
          {!chatOpen && (
            <span className="absolute -right-0.5 -top-0.5 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
          )}
        </div>
        <span className="text-[9px] font-medium tracking-tight truncate w-full text-center px-1">
          {t('dashboard.aiAssistant').split(' ')[0]} {/* Shorten name for mobile nav */}
        </span>
      </button>
    </nav>
  )
}
