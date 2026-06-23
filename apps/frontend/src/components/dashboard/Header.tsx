import { AnimatePresence, motion } from 'framer-motion'
import { Bell, LogOut, Plus, Waypoints, WifiOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

import { useAuth } from '../../hooks/useAuth'
import type { PlannedEvent } from '../../types'

interface HeaderProps {
  wsConnected: boolean
  activeEvents: PlannedEvent[]
  onEventSelect?: (ev: PlannedEvent) => void
  isControlPanelOpen?: boolean
  onControlPanelToggle?: () => void
}

function formatTimeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function Header({
  wsConnected,
  activeEvents,
  onEventSelect,
  isControlPanelOpen,
  onControlPanelToggle,
}: HeaderProps) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
      className="relative flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-4 md:px-6 z-50"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Waypoints size={17} strokeWidth={2.4} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">
            GridLock
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {user?.role === 'controller'
              ? t('dashboard.commandCenter')
              : t('dashboard.fieldOperations')}
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Connection Status */}
        {wsConnected ? (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            {t('dashboard.live')}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
            <WifiOff size={11} />
            {t('dashboard.offline')}
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted ${showNotifications ? 'bg-muted text-foreground' : ''}`}
          >
            <Bell size={18} />
            {activeEvents.length > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 12 }}
                className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white ring-2 ring-card"
              >
                {activeEvents.length}
              </motion.span>
            )}
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card/95 backdrop-blur-xl p-3 shadow-2xl z-50 overflow-hidden"
              >
                <div className="mb-2 flex items-center justify-between px-2 pb-2 pt-1 border-b border-border/50">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {activeEvents.length} Active
                  </span>
                </div>

                <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">
                  {activeEvents.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No new notifications
                    </div>
                  ) : (
                    activeEvents.map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => {
                          onEventSelect?.(ev)
                          setShowNotifications(false)
                        }}
                        className="flex flex-col gap-1 rounded-lg p-2.5 text-left hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50 group"
                      >
                        <div className="flex items-start justify-between w-full">
                          <span className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                            {ev.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap pt-0.5">
                            {formatTimeAgo(ev.start_datetime)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-medium truncate">
                            {ev.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {ev.type}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Theme Toggle */}
        <div className="hidden md:block">
          <ThemeToggle />
        </div>

        {/* Mobile Plan Button */}
        <div className="block md:hidden">
          <Button
            variant="default"
            size="sm"
            onClick={onControlPanelToggle}
            className="h-7 px-2 text-[11px] gap-1"
          >
            <Plus size={12} />
            {isControlPanelOpen ? 'Close' : 'Plan'}
          </Button>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-border" />

        {/* User Profile & Logout */}
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7 border border-border">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
            <AvatarFallback className="text-xs">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden flex-col md:flex">
            <span className="text-xs font-medium text-foreground leading-none">{user?.email}</span>
            <span className="text-[11px] text-muted-foreground mt-0.5 capitalize">
              {user?.role}
            </span>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
              title="Sign out"
            >
              <LogOut size={15} />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.header>
  )
}
