import { Bell, LogOut, Radio, Shield, User } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { useAuth } from '../../../hooks/useAuth'
import type { DashboardOutletContext } from '../AppLayout'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { wsConnected } = useOutletContext<DashboardOutletContext>()

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Account and system preferences</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <User size={16} /> Account
            </CardTitle>
            <CardDescription>Signed-in controller identity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
                />
                <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {user?.role}
                </Badge>
              </div>
            </div>
            <Separator className="my-4" />
            <Button variant="outline" className="w-full" onClick={logout}>
              <LogOut size={16} /> Sign out
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Radio size={16} /> System Status
            </CardTitle>
            <CardDescription>Live data connection and alerts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Shield size={16} className="text-muted-foreground" /> WebSocket Sync
              </span>
              <Badge variant={wsConnected ? 'default' : 'destructive'}>
                {wsConnected ? 'Connected' : 'Offline'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Bell size={16} className="text-muted-foreground" /> Notifications
              </span>
              <Badge variant="outline">Enabled</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
