import { ArrowRight, Radio, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      {/* Light modern grid background */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSIjMGIxMjIyIiBmaWxsLW9wYWNpdHk9IjAuMDQiIGZpbGwtcnVsZT0iZXZlbm9kZCI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwYzUuNTIzIDAgMTAgNC40NzcgMTAgMTBzLTQuNDc3IDEwLTEwIDEwLTEwLTQuNDc3LTEwLTEwIDQuNDc3LTEwIDEwLTEwem0wIDE4Yy00LjQxOCAwLTgtMy41ODItOC04czMuNTgyLTggOC04IDggMy41ODIgOCA4LTMuNTgyIDgtOCA4em0wLThjMi4yMSAwIDQgMS43OSA0IDRzLTEuNzkgNC00IDQtNC0xLjc5LTQtNCAxLjc5LTQgNC00em0wIDZjMS4xMDUgMCAyLS44OTUgMi0ycy0uODk1LTItMi0yLTItLjg5NS0yLTIgLjg5NS0yIDItMnoiLz48L2c+PC9zdmc+')] dark:invert dark:opacity-10 opacity-60"></div>

      {/* Modern gradient blobs */}
      <div className="absolute top-0 right-0 -mr-48 -mt-48 w-96 h-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-48 -mb-48 w-96 h-96 rounded-full bg-[#10b981]/10 blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 px-6 w-full max-w-5xl">
        {/* Header */}
        <div className="animate-fade-in flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
              GridLock
            </h1>
            <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
              AI-Powered Traffic Command Center. Predict, manage, and mitigate urban congestion in
              real-time.
            </p>
          </div>
        </div>

        {/* Role Selection Cards */}
        <div className="animate-slide-up flex flex-col gap-6 sm:flex-row w-full justify-center">
          {/* Controller Card */}
          <Card
            className="group relative flex w-full sm:w-[340px] cursor-pointer flex-col p-8 transition-all duration-300 hover:border-primary hover:shadow-md bg-card/80 backdrop-blur-sm"
            onClick={() => navigate('/login/controller')}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6 transition-transform group-hover:scale-110">
              <Shield size={28} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Command Center</h2>
            <p className="text-sm text-muted-foreground mb-8 flex-1">
              For traffic controllers. Monitor city-wide traffic, plan events, and deploy resources
              via the AI pipeline.
            </p>
            <Button
              variant="outline"
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors justify-between"
            >
              Controller Login
              <ArrowRight size={16} />
            </Button>
          </Card>

          {/* Fleet Member Card */}
          <Card
            className="group relative flex w-full sm:w-[340px] cursor-pointer flex-col p-8 transition-all duration-300 hover:border-[#10b981] hover:shadow-md bg-card/80 backdrop-blur-sm"
            onClick={() => navigate('/login/fleet')}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#10b981]/10 text-[#10b981] mb-6 transition-transform group-hover:scale-110">
              <Radio size={28} />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Field Operations</h2>
            <p className="text-sm text-muted-foreground mb-8 flex-1">
              For fleet officers. Receive routing orders, view impact zones, and report incidents
              directly from the field.
            </p>
            <Button
              variant="outline"
              className="w-full hover:bg-[#10b981] hover:border-[#10b981] hover:text-white transition-colors justify-between"
            >
              Fleet Login
              <ArrowRight size={16} />
            </Button>
          </Card>
        </div>

        {/* Footer */}
        <p className="animate-fade-in text-sm text-muted-foreground font-medium mt-8">
          Powered by MapMyIndia
        </p>
      </div>
    </div>
  )
}
