import { AnimatePresence, motion, useInView } from 'framer-motion'
import {
  BarChart3,
  Clock,
  Cpu,
  Database,
  Hexagon,
  Package,
  Route,
  ShieldCheck,
  TrafficCone,
  Waves,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

const PIPELINE_STEPS = [
  { id: 1, title: 'Event Intake & DB Seeding', icon: Database, subtitle: 'PostgreSQL Insert' },
  { id: 2, title: 'ML Core Prediction', icon: Cpu, subtitle: 'Heterogeneous Stacked Ensemble' },
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
  isOpen?: boolean
  onClose?: () => void
  autoStart?: boolean
  inline?: boolean
}

export default function CircularPipeline({
  isOpen = true,
  onClose,
  autoStart = false,
  inline = false,
}: CircularPipelineProps) {
  const [currentStep, setCurrentStep] = useState<number>(-1) // -1: idle, 0-9: processing, 10: completed
  const [isPlaying, setIsPlaying] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { margin: '-200px' })

  const containerSize = 480
  const radius = 170
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
      const timer = setTimeout(() => {
        if (autoStart && isInView) {
          setCurrentStep(0)
        } else {
          setIsPlaying(false)
        }
      }, 1500)
      return () => clearTimeout(timer)
    }

    // Faster processing delay
    const delay = Math.random() * 200 + 400

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
    }, delay)

    return () => clearTimeout(timer)
  }, [currentStep, isPlaying, autoStart, isInView])

  // Scroll visibility handler
  useEffect(() => {
    if (!autoStart || !isOpen) return

    const timer = setTimeout(() => {
      if (isInView) {
        setIsPlaying(true)
        setCurrentStep((prev) => {
          if (prev === -1 || prev >= PIPELINE_STEPS.length) {
            return 0
          }
          return prev
        })
      } else {
        setIsPlaying(false)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [isInView, autoStart, isOpen])

  const content = (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center min-h-[600px] w-full max-w-4xl bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800/50 shadow-2xl mx-auto"
    >
      {/* Close Button */}
      {!inline && onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-slate-200 dark:bg-slate-900 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors z-50 border border-slate-300 dark:border-slate-800"
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
      )}

      {/* Background ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-100/50 via-slate-50 to-slate-50 dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Cyberpunk grid overlay */}
      <div
        className="absolute inset-0 opacity-10 dark:opacity-[0.03] pointer-events-none"
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
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full flex flex-col items-center justify-center border border-slate-300 dark:border-slate-800/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-0 transition-all duration-700 shadow-xl"
          style={{
            boxShadow:
              currentStep >= PIPELINE_STEPS.length
                ? '0 0 40px rgba(16, 185, 129, 0.2)'
                : isPlaying
                  ? '0 0 30px rgba(14, 165, 233, 0.2)'
                  : '0 0 15px rgba(30, 41, 59, 0.1)',
          }}
        >
          {/* Internal rotating rings for processing state */}
          <div
            className={`absolute inset-3 border border-dashed rounded-full transition-all duration-1000 ${isPlaying && currentStep < 10 ? 'border-sky-500/40 animate-[spin_10s_linear_infinite]' : 'border-slate-300 dark:border-slate-800 opacity-50'}`}
          />
          <div
            className={`absolute inset-6 border border-dashed rounded-full transition-all duration-1000 ${isPlaying && currentStep < 10 ? 'border-amber-500/30 animate-[spin_15s_linear_infinite_reverse]' : 'border-slate-200 dark:border-slate-800 opacity-30'}`}
          />

          <div className="text-3xl font-mono font-bold tracking-[0.3em] text-slate-900 dark:text-white z-10 text-center pl-[0.3em]">
            GRIDLOCK
          </div>

          {currentStep >= 10 && (
            <div className="absolute inset-0 bg-emerald-500/5 rounded-full animate-pulse pointer-events-none" />
          )}
        </div>

        {/* Nodes (HTML Absolute Positioning - NO CONTAINER ROTATION) */}
        {nodes.map((node) => {
          const Icon = node.icon
          const isPending = node.state === 'pending'
          const isProcessing = node.state === 'processing'
          const isCompleted = node.state === 'completed'

          // Determine label positioning based on angle
          // Right half: text on right. Left half: text on left.
          const isRight = node.x >= center
          const isTopMost = node.id === 1
          const isBottomMost = node.id === 6

          let positioningClass = ''
          let customStyle: React.CSSProperties = {}

          if (isTopMost) {
            positioningClass = 'bottom-full mb-3 items-center'
            customStyle = { left: '50%', transform: 'translateX(-50%)' }
          } else if (isBottomMost) {
            positioningClass = 'top-full mt-3 items-center'
            customStyle = { left: '50%', transform: 'translateX(-50%)' }
          } else {
            positioningClass = isRight ? 'left-full ml-5 items-start' : 'right-full mr-5 items-end'
            customStyle = {
              marginTop: node.y < center - 50 ? '-30px' : node.y > center + 50 ? '30px' : '0px',
            }
          }

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
                    relative w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-500 border-2 bg-white dark:bg-slate-950
                    ${isPending ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 shadow-none' : ''}
                    ${isProcessing ? 'border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-110' : ''}
                    ${isCompleted ? 'border-emerald-500 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-emerald-50 dark:bg-emerald-950/20' : ''}
                  `}
                >
                  <Icon
                    size={18}
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
                    ${positioningClass}
                    ${isPending ? 'opacity-30' : 'opacity-100'}
                  `}
                  style={customStyle}
                >
                  <span
                    className={`
                    text-[9px] font-mono tracking-widest uppercase mb-0.5
                    ${isCompleted ? 'text-emerald-600 dark:text-emerald-500/70' : isProcessing ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-slate-600'}
                  `}
                  >
                    STEP 0{node.id}
                  </span>
                  <span
                    className={`
                    text-xs font-bold tracking-tight
                    ${isCompleted ? 'text-slate-900 dark:text-emerald-50' : isProcessing ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}
                  `}
                  >
                    {node.title}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {node.subtitle}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  if (inline) {
    return content
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
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
