import { Bell, LogOut, Shield, WifiOff } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  wsConnected: boolean
  activeEvents: number
}

export default function Header({ wsConnected, activeEvents }: HeaderProps) {
  const { user, logout } = useAuth()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Shield size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground leading-none">
            GridLock
          </h1>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            {user?.role === 'controller' ? 'Command Center' : 'Field Operations'}
          </p>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {wsConnected ? (
            <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
              </span>
              Live Sync
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
              <WifiOff size={12} />
              Offline
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="flex items-center gap-4">
          <button className="relative text-muted-foreground hover:text-foreground transition-colors">
            <Bell size={20} />
            {activeEvents > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-2 ring-card">
                {activeEvents}
              </span>
            )}
          </button>
        </div>

        {/* Separator */}
        <div className="h-8 w-px bg-border" />

        {/* User Profile & Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} />
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col md:flex">
              <span className="text-sm font-medium text-foreground leading-none">
                {user?.email}
              </span>
              <span className="text-xs text-muted-foreground mt-1 capitalize">{user?.role}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={logout}
            title="Sign out"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  )
}
