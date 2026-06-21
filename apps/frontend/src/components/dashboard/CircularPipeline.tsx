import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Clock,
  Cpu,
  Database,
  Hexagon,
  Package,
  Play,
  Route,
  ShieldCheck,
  TrafficCone,
  Waves,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

const PIPELINE_STEPS = [
  { id: 1, title: 'Event Intake & DB Seeding', icon: Database, subtitle: 'PostgreSQL Insert' },
  { id: 2, title: 'ML Core Prediction', icon: Cpu, subtitle: 'CatBoost/LGBM Champion' },
  {
    id: 3,
    title: 'Queueing Capacity Analysis',
    icon: BarChart3,
    subtitle: 'M/M/c/K Statistical Model',
  },
  { id: 4, title: 'Anomaly Baseline Verification', icon: ShieldCheck, subtitle: 'Prophet Engine' },
  { id: 5, title: 'Kinematic Propagation Engine', icon: Waves, subtitle: 'LWR Fluid Dynamics' },
  { id: 6, title: 'Resource Optimization', icon: Package, subtitle: 'Greedy Knapsack' },
  { id: 7, title: 'Barricade Strategy Blueprint', icon: Hexagon, subtitle: 'Polygon Mapping' },
  { id: 8, title: 'Diversion Routing Engine', icon: Route, subtitle: 'Conflict Resolution' },
  { id: 9, title: 'Perimeter Signal Gating', icon: TrafficCone, subtitle: 'Macro Density Control' },
  { id: 10, title: 'Pre-Staging Timeline Commit', icon: Clock, subtitle: 'Task Scheduler' },
]

type StepState = 'pending' | 'processing' | 'completed'

interface CircularPipelineProps {
  isOpen: boolean
  onClose: () => void
  autoStart?: boolean
}

export default function CircularPipeline({
  isOpen,
  onClose,
  autoStart = false,
}: CircularPipelineProps) {
  const [currentStep, setCurrentStep] = useState<number>(-1) // -1: idle, 0-9: processing, 10: completed
  const [isPlaying, setIsPlaying] = useState(false)

  const containerSize = 700
  const radius = 260
  const center = containerSize / 2
  const circumference = 2 * Math.PI * radius

  // Compute node positions
  const nodes = PIPELINE_STEPS.map((step, i) => {
    // Start at top (Math.PI / 2 offset)
    const angle = (i * (2 * Math.PI)) / PIPELINE_STEPS.length - Math.PI / 2
    const x = center + radius * Math.cos(angle)
    const y = center + radius * Math.sin(angle)

    // Determine state
    let state: StepState = 'pending'
    if (currentStep === i) state = 'processing'
    if (currentStep > i) state = 'completed'

    return { ...step, angle, x, y, state }
  })

  // Calculate progress for the glowing SVG path
  const progressPercent = Math.max(
    0,
    Math.min(100, (currentStep / (PIPELINE_STEPS.length - 1)) * 100),
  )
  const strokeDashoffset =
    currentStep === -1 ? circumference : circumference - (progressPercent / 100) * circumference

  // Simulator effect
  useEffect(() => {
    if (!isPlaying) return

    if (currentStep >= PIPELINE_STEPS.length) {
      const timer = setTimeout(() => setIsPlaying(false), 0)
      return () => clearTimeout(timer)
    }

    // Processing delay between 800ms and 1500ms for realism
    const delay = Math.random() * 700 + 800

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
    }, delay)

    return () => clearTimeout(timer)
  }, [currentStep, isPlaying])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (autoStart) {
          setCurrentStep(0)
          setIsPlaying(true)
        } else {
          setCurrentStep(-1)
          setIsPlaying(false)
        }
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoStart])

  const handleSimulate = () => {
    setCurrentStep(0)
    setIsPlaying(true)
  }

  const handleReset = () => {
    setCurrentStep(-1)
    setIsPlaying(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <div className="relative flex flex-col items-center justify-center min-h-[800px] w-full max-w-5xl bg-slate-950 font-sans text-slate-200 overflow-hidden rounded-xl border border-slate-800/50 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors z-50 border border-slate-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            {/* Background ambient gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950 pointer-events-none" />

            {/* Cyberpunk grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #475569 1px, transparent 1px), linear-gradient(to bottom, #475569 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            <div className="relative" style={{ width: containerSize, height: containerSize }}>
              {/* SVG Track Layer */}
              <svg
                width={containerSize}
                height={containerSize}
                className="absolute inset-0"
                style={{ transform: 'rotate(-90deg)' }} // Rotate SVG so stroke-dashoffset starts at top
              >
                <defs>
                  <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="8" result="blur1" />
                    <feGaussianBlur stdDeviation="16" result="blur2" />
                    <feMerge>
                      <feMergeNode in="blur2" />
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(16, 185, 129, 0.2)" />
                    <stop offset="100%" stopColor="rgba(2, 6, 23, 0)" />
                  </radialGradient>
                </defs>

                {/* Base track (pending) */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="#1e293b" // slate-800
                  strokeWidth="4"
                  className="transition-colors duration-1000"
                />

                {/* Animated active progress track */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="url(#progress-gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  filter="url(#neon-glow)"
                  className="transition-all duration-1000 ease-in-out"
                />

                {/* Particle stream effect (visible when processing) */}
                {isPlaying && currentStep < PIPELINE_STEPS.length && (
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeDasharray="4 20"
                    className="animate-[spin_4s_linear_infinite] opacity-30"
                    style={{ transformOrigin: 'center' }}
                  />
                )}
              </svg>

              {/* Central Core Ambient Display */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full flex flex-col items-center justify-center border border-slate-800/50 backdrop-blur-sm z-0 transition-all duration-700"
                style={{
                  boxShadow:
                    currentStep >= PIPELINE_STEPS.length
                      ? '0 0 80px rgba(16, 185, 129, 0.15), inset 0 0 40px rgba(16, 185, 129, 0.1)'
                      : isPlaying
                        ? '0 0 60px rgba(14, 165, 233, 0.15), inset 0 0 30px rgba(14, 165, 233, 0.1)'
                        : 'inset 0 0 20px rgba(30, 41, 59, 0.5)',
                  background:
                    'radial-gradient(circle, rgba(15,23,42,0.8) 0%, rgba(2,6,23,0.9) 100%)',
                }}
              >
                {/* Internal rotating rings for processing state */}
                <div
                  className={`absolute inset-4 border border-dashed rounded-full transition-all duration-1000 ${isPlaying && currentStep < 10 ? 'border-sky-500/30 animate-[spin_10s_linear_infinite]' : 'border-slate-800 opacity-50'}`}
                />
                <div
                  className={`absolute inset-8 border border-dashed rounded-full transition-all duration-1000 ${isPlaying && currentStep < 10 ? 'border-amber-500/20 animate-[spin_15s_linear_infinite_reverse]' : 'border-slate-800 opacity-30'}`}
                />

                <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold mb-2">
                  Engine Core
                </span>

                <div className="text-3xl font-mono font-bold tracking-tight">
                  {currentStep === -1 ? 'IDLE' : currentStep >= 10 ? 'ONLINE' : 'SYNCING'}
                </div>

                <div
                  className={`text-xs mt-2 font-mono transition-colors duration-500 ${currentStep >= 10 ? 'text-emerald-400' : isPlaying ? 'text-sky-400' : 'text-slate-600'}`}
                >
                  {currentStep === -1
                    ? 'Awaiting Event Input'
                    : currentStep >= 10
                      ? 'System Matrices Stable'
                      : `[SEQ_0${currentStep + 1} // ACTIVE]`}
                </div>

                {currentStep >= 10 && (
                  <div className="absolute inset-0 bg-emerald-500/5 rounded-full animate-pulse pointer-events-none" />
                )}
              </div>

              {/* Nodes (HTML Absolute Positioning - NO CONTAINER ROTATION) */}
              {nodes.map((node, i) => {
                const Icon = node.icon
                const isPending = node.state === 'pending'
                const isProcessing = node.state === 'processing'
                const isCompleted = node.state === 'completed'

                // Determine label positioning based on angle
                // Right half: text on right. Left half: text on left.
                const isRight = node.x >= center
                const isBottom = node.y >= center

                return (
                  <div
                    key={node.id}
                    className="absolute z-10 transition-all duration-500"
                    style={{
                      left: node.x,
                      top: node.y,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div className="relative group flex items-center justify-center">
                      {/* Visual Ring System for Node */}
                      <div
                        className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-500 border-2 bg-slate-950
                    ${isPending ? 'border-slate-800 text-slate-600 shadow-none' : ''}
                    ${isProcessing ? 'border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-110' : ''}
                    ${isCompleted ? 'border-emerald-500 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)] bg-emerald-950/20' : ''}
                  `}
                      >
                        <Icon
                          size={20}
                          className={`${isProcessing ? 'animate-pulse' : ''}`}
                          strokeWidth={2.5}
                        />

                        {/* Processing Dual-Ring Animations */}
                        {isProcessing && (
                          <>
                            <div
                              className="absolute -inset-2 border border-sky-500/50 rounded-full animate-[spin_3s_linear_infinite]"
                              style={{
                                borderTopColor: 'transparent',
                                borderLeftColor: 'transparent',
                              }}
                            />
                            <div
                              className="absolute -inset-3 border border-amber-500/30 rounded-full animate-[spin_4s_linear_infinite_reverse]"
                              style={{
                                borderBottomColor: 'transparent',
                                borderRightColor: 'transparent',
                              }}
                            />
                          </>
                        )}
                      </div>

                      {/* Floating Label (Strictly Upright) */}
                      <div
                        className={`
                    absolute pointer-events-none whitespace-nowrap flex flex-col
                    transition-all duration-500
                    ${isRight ? 'left-full ml-4 items-start' : 'right-full mr-4 items-end'}
                    ${isPending ? 'opacity-30' : 'opacity-100'}
                  `}
                      >
                        <span
                          className={`
                    text-[10px] font-mono tracking-widest uppercase mb-0.5
                    ${isCompleted ? 'text-emerald-500/70' : isProcessing ? 'text-amber-500' : 'text-slate-600'}
                  `}
                        >
                          STEP 0{node.id}
                        </span>
                        <span
                          className={`
                    text-sm font-bold tracking-tight
                    ${isCompleted ? 'text-emerald-50' : isProcessing ? 'text-white' : 'text-slate-400'}
                  `}
                        >
                          {node.title}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{node.subtitle}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Control Panel */}
            <div className="absolute bottom-8 flex gap-4 z-20">
              <button
                onClick={handleSimulate}
                disabled={isPlaying || currentStep >= 10}
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-full shadow-[0_0_20px_rgba(2,132,199,0.3)] disabled:shadow-none transition-all duration-300"
              >
                <Play size={16} fill="currentColor" />
                {isPlaying ? 'EXECUTING PIPELINE...' : 'SIMULATE EXECUTION'}
              </button>

              {currentStep > -1 && !isPlaying && (
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-full transition-all duration-300 border border-slate-700"
                >
                  RESET
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
