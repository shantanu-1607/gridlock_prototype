import { AlertCircle, Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useAuth } from '../../hooks/useAuth'
import { validateEmail, validatePassword } from '../../utils/validators'

const ControllerLogin: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  // Live road-graph size for the "Intersections" stat (real count, not a marketing number).
  const [junctionCount, setJunctionCount] = useState<number | null>(null)
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    fetch(`${apiBase}/api/health/ml-stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = d?.junction_count
        if (typeof n === 'number' && n > 0) setJunctionCount(n)
      })
      .catch(() => {
        /* offline — keep the fallback */
      })
  }, [])

  const validate = (): boolean => {
    const emailResult = validateEmail(email)
    const passwordResult = validatePassword(password)
    const newErrors: { email?: string; password?: string } = {}
    if (!emailResult.valid) newErrors.email = emailResult.error
    if (!passwordResult.valid) newErrors.password = passwordResult.error
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validate()) {
      return
    }

    setIsLoading(true)
    try {
      await login({ email, password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-transparent">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo and Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Traffic Command Center</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to access the controller dashboard
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-8 shadow-lg border-border">
            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-red/30 bg-red/10 px-4 py-3 text-sm text-red animate-fade-in">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="controller@gridlock.in"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                    }}
                    className={`pl-10 h-11 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
                    }}
                    className={`pl-10 pr-10 h-11 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked: boolean) => setRememberMe(checked)}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal text-muted-foreground cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember me
                  </Label>
                </div>
                <button type="button" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Demo: <span className="font-mono">controller@gridlock.in</span> /{' '}
                <span className="font-mono">gridlock</span>
              </p>
            </div>
          </Card>

          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              &larr; Back to Role Selection
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/20 via-primary/5 to-background overflow-hidden border-l border-border">
        {/* Abstract pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50 dark:invert"></div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center">
          <div className="max-w-lg space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-background border border-border shadow-sm flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-10 h-10 text-primary" />
            </div>

            <h2 className="text-3xl font-bold text-foreground">Intelligent Traffic Management</h2>

            <p className="text-lg text-muted-foreground">
              Monitor, analyze, and control traffic flow in real-time with GridLock's advanced AI
              pipeline.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="space-y-2 bg-background/50 p-4 rounded-lg border border-border backdrop-blur-md">
                <div className="text-2xl font-bold text-primary">90%</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Forecast Coverage
                </div>
              </div>
              <div className="space-y-2 bg-background/50 p-4 rounded-lg border border-border backdrop-blur-md">
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Monitoring
                </div>
              </div>
              <div className="space-y-2 bg-background/50 p-4 rounded-lg border border-border backdrop-blur-md">
                <div className="text-2xl font-bold text-primary">{junctionCount ?? 294}</div>
                <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                  Intersections
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl"></div>
      </div>
    </div>
  )
}

export default ControllerLogin
