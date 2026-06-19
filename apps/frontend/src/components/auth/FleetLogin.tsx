import { AlertCircle, Eye, EyeOff, Lock, Mail, Radio } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useAuth } from '../../hooks/useAuth'
import { validateEmail, validatePassword } from '../../utils/validators'

const FleetLogin: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

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
      navigate('/fleet', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-row-reverse">
      {/* Left Side - Login Form (Flipped to right for Fleet) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo and Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-[#10b981]/10 flex items-center justify-center mb-2">
              <Radio className="w-8 h-8 text-[#10b981]" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Field Operations</h1>
            <p className="text-muted-foreground text-sm">
              Sign in to access your fleet assignments
            </p>
          </div>

          {/* Login Form */}
          <Card className="p-8 shadow-lg border-border">
            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 animate-fade-in">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Fleet Email / ID
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="fleet@gridlock.in"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                    }}
                    className={`pl-10 h-11 focus-visible:ring-[#10b981]/50 ${errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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
                    className={`pl-10 pr-10 h-11 focus-visible:ring-[#10b981]/50 ${errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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
                    className="data-[state=checked]:bg-[#10b981] data-[state=checked]:border-[#10b981]"
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal text-muted-foreground cursor-pointer leading-none"
                  >
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-[#10b981] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium bg-[#10b981] hover:bg-[#059669] text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  'Access Field Operations'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Demo: <span className="font-mono">fleet@gridlock.in</span> /{' '}
                <span className="font-mono">gridlock</span>
              </p>
            </div>
          </Card>

          <div className="text-center mt-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-muted-foreground hover:text-[#10b981] transition-colors"
            >
              &larr; Back to Role Selection
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Visual (Flipped to left) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#10b981]/20 via-[#10b981]/5 to-background overflow-hidden border-r border-border">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50 dark:invert"></div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-center">
          <div className="max-w-lg space-y-6">
            <div className="w-24 h-24 mx-auto rounded-full bg-background border border-border shadow-sm flex items-center justify-center backdrop-blur-sm">
              <Radio className="w-10 h-10 text-[#10b981]" />
            </div>

            <h2 className="text-3xl font-bold text-foreground">Mobile Field Response</h2>

            <p className="text-lg text-muted-foreground">
              Receive real-time deployment orders and navigate directly to incident impact zones.
            </p>

            <div className="flex flex-col gap-4 pt-6 text-left w-full max-w-sm mx-auto">
              <div className="flex items-center gap-4 bg-background/60 p-4 rounded-xl border border-border">
                <div className="h-10 w-10 rounded-full bg-[#10b981]/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-[#10b981]">01</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Receive Orders</h4>
                  <p className="text-xs text-muted-foreground">Instant assignments from HQ</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-background/60 p-4 rounded-xl border border-border">
                <div className="h-10 w-10 rounded-full bg-[#10b981]/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-[#10b981]">02</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Navigate</h4>
                  <p className="text-xs text-muted-foreground">Turn-by-turn to impact zone</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-background/60 p-4 rounded-xl border border-border">
                <div className="h-10 w-10 rounded-full bg-[#10b981]/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-[#10b981]">03</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Report</h4>
                  <p className="text-xs text-muted-foreground">Send live updates to Command</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-[#10b981]/20 blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-[#10b981]/20 blur-3xl"></div>
      </div>
    </div>
  )
}

export default FleetLogin
