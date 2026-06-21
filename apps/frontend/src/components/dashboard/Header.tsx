import { motion } from 'framer-motion'
import { Bell, LogOut, Waypoints, WifiOff } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  wsConnected: boolean
  activeEvents: number
}

export default function Header({ wsConnected, activeEvents }: HeaderProps) {
  const { user, logout } = useAuth()

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
      className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 backdrop-blur-xl px-6 z-20"
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
            {user?.role === 'controller' ? 'Command Center' : 'Field Operations'}
          </p>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Connection Status */}
        {wsConnected ? (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
            <WifiOff size={11} />
            Offline
          </div>
        )}

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted"
        >
          <Bell size={18} />
          {activeEvents > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white ring-2 ring-card"
            >
              {activeEvents}
            </motion.span>
          )}
        </motion.button>

        {/* Theme Toggle */}
        <ThemeToggle />

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
