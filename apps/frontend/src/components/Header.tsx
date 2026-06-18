import { Activity, Shield, Wifi, WifiOff } from 'lucide-react'

interface HeaderProps {
  wsConnected: boolean
  activeEvents: number
}

export default function Header({ wsConnected, activeEvents }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <Shield size={28} />
          <div>
            <h1>GRIDLOCK</h1>
            <span className="logo-sub">Proactive Traffic Command Center</span>
          </div>
        </div>
      </div>
      <div className="header-right">
        <div className="header-stat">
          <Activity size={16} />
          <span>{activeEvents} Active</span>
        </div>
        <div className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}>
          {wsConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span>{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
        <div className="header-time">
          {new Date().toLocaleTimeString('en-IN', { hour12: false })}
        </div>
      </div>
    </header>
  )
}
