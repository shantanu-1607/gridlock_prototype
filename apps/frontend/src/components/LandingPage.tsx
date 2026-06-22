import {
  AnimatePresence,
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  Radar,
  Send,
  Shield,
  Users,
  Waypoints,
  X,
  Zap,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { HeroSection } from '@/components/ui/hero-section-dark'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

import CircularPipeline from './dashboard/CircularPipeline'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    id: 'bfs',
    titleKey: 'featuresList.bfsTitle',
    descKey: 'featuresList.bfsDesc',
    detailsKey: 'featuresList.bfsDetails',
    icon: Activity,
  },
  {
    id: 'ml',
    titleKey: 'featuresList.mlTitle',
    descKey: 'featuresList.mlDesc',
    detailsKey: 'featuresList.mlDetails',
    icon: Brain,
  },
  {
    id: 'llm',
    titleKey: 'featuresList.llmTitle',
    descKey: 'featuresList.llmDesc',
    detailsKey: 'featuresList.llmDetails',
    icon: Zap,
  },
  {
    id: 'mmi',
    titleKey: 'featuresList.mmiTitle',
    descKey: 'featuresList.mmiDesc',
    detailsKey: 'featuresList.mmiDetails',
    icon: MapPin,
  },
]

// Fingerprint count is hydrated from the live ML corpus at runtime (see useEffect
// below); 2.5 (≈2,497 reference incidents) is the build-time fallback. The 90%
// "Forecast Coverage" is the model's conformal prediction-interval target coverage
// — a real, calibrated metric, unlike the previous unmeasured "1s" latency claim.
const stats = [
  { value: 30, suffix: 'm', labelKey: 'stats.forecast', icon: Clock },
  { value: 2.5, suffix: 'k+', labelKey: 'stats.fingerprints', icon: Brain },
  { value: 90, suffix: '%', labelKey: 'stats.coverage', icon: Radar },
  { value: 1, suffix: '', labelKey: 'stats.mission', icon: Waypoints },
]

const steps = [
  {
    step: '01',
    titleKey: 'steps.detectTitle',
    descriptionKey: 'steps.detectDesc',
    icon: Activity,
  },
  {
    step: '02',
    titleKey: 'steps.anticipateTitle',
    descriptionKey: 'steps.anticipateDesc',
    icon: Brain,
  },
  {
    step: '03',
    titleKey: 'steps.dispatchTitle',
    descriptionKey: 'steps.dispatchDesc',
    icon: Send,
  },
  {
    step: '04',
    titleKey: 'steps.resolveTitle',
    descriptionKey: 'steps.resolveDesc',
    icon: CheckCircle2,
  },
]

const trustedBy = [
  'Municipal Traffic Authority',
  'Smart City Initiative',
  'National Highway Dept.',
  'Metro Transit Corp.',
]

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 0.4, 0.25, 1] },
  },
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6 },
  },
}

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
  },
}

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 1600
    const startTime = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Number((eased * value).toFixed(value % 1 !== 0 ? 1 : 0)))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, value])

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  System Chatter Component                                           */
/* ------------------------------------------------------------------ */

function SystemChatter() {
  const { t } = useTranslation()
  const [logIndices, setLogIndices] = useState<number[]>([])
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setLogIndices((prev) => [...prev.slice(-3), (i % 6) + 1])
      i++
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute top-6 right-6 w-64 md:w-72 bg-black/80 border border-emerald-500/30 rounded-lg p-3 font-mono text-[10px] text-emerald-500 backdrop-blur-md shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center gap-1.5 mb-2 border-b border-emerald-500/30 pb-2">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="ml-2 text-emerald-500/70 font-semibold tracking-wider">
          {t('systemChatter.title')}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 min-h-[70px] justify-end">
        {logIndices.map((logIdx, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <span className="text-emerald-500/50 mr-1">{'>'}</span>{' '}
            {t(`systemChatter.log${logIdx}`)}
          </motion.div>
        ))}
        <motion.div animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }}>
          <span className="text-emerald-500/50 mr-1">{'>'}</span> _
        </motion.div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Smooth Scroll Component                                            */
/* ------------------------------------------------------------------ */

function SmoothScroll({ children }: { children: React.ReactNode }) {
  const { scrollY } = useScroll()
  const transformY = useTransform(scrollY, (y) => -y)
  // Tighter physics to prevent trackpad momentum from scrolling too far
  const springY = useSpring(transformY, {
    damping: 30,
    mass: 0.1,
    stiffness: 150,
  })

  const contentRef = useRef<HTMLDivElement>(null)
  const [pageHeight, setPageHeight] = useState(0)
  const [isFallback] = useState(() => {
    if (typeof window === 'undefined') return false
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    const isMobile = window.innerWidth < 768
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return isTouch || isMobile || prefersReducedMotion
  })

  useEffect(() => {
    if (isFallback) return

    if (!contentRef.current) return
    const resizeObserver = new ResizeObserver((entries) => {
      setPageHeight(entries[0].contentRect.height)
    })
    resizeObserver.observe(contentRef.current)

    // Prevent browser overscroll bounce which exacerbates momentum scroll issues
    document.body.style.overscrollBehaviorY = 'none'

    return () => {
      resizeObserver.disconnect()
      document.body.style.overscrollBehaviorY = ''
    }
  }, [isFallback])

  if (isFallback) {
    return <>{children}</>
  }

  return (
    <>
      <motion.div
        ref={contentRef}
        style={{ y: springY }}
        className="fixed top-0 left-0 w-full will-change-transform z-0"
      >
        {children}
      </motion.div>
      <div style={{ height: pageHeight }} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)

  // Hydrate the "Incident Fingerprints" stat from the live ML corpus. Falls back to
  // the build-time value in `stats` if the backend/ML service isn't reachable.
  const [corpusSize, setCorpusSize] = useState<number | null>(null)
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    fetch(`${apiBase}/api/health/ml-stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = d?.fingerprint_corpus_size
        if (typeof n === 'number' && n > 0) setCorpusSize(n)
      })
      .catch(() => {
        /* offline — keep the fallback */
      })
  }, [])

  const liveStats = stats.map((s) =>
    s.labelKey === 'stats.fingerprints' && corpusSize
      ? { ...s, value: Math.round((corpusSize / 1000) * 10) / 10, suffix: 'k+' }
      : s,
  )

  const scrollToSection = (e: React.MouseEvent<HTMLElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      let top = 0
      let el: HTMLElement | null = element
      while (el) {
        top += el.offsetTop
        el = el.offsetParent as HTMLElement
      }
      window.scrollTo({ top, behavior: 'auto' })
    }
  }

  return (
    <>
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Waypoints size={20} strokeWidth={2.4} />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">GridLock</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="#features"
            onClick={(e) => scrollToSection(e, 'features')}
            className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.features')}
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => scrollToSection(e, 'how-it-works')}
            className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.howItWorks')}
          </a>
          <a
            href="#roles-section"
            onClick={(e) => scrollToSection(e, 'roles-section')}
            className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.getStarted')}
          </a>
          <div className="w-px h-5 bg-border hidden md:block" />
          <LanguageSwitcher />
        </div>
      </nav>

      <SmoothScroll>
        <div className="relative flex flex-col bg-black/40 font-sans">
          {/* ── Hero ───────────────────────────────────────────────────── */}
          <HeroSection
            title={t('hero.title')}
            subtitle={{
              regular: t('hero.subtitle'),
              gradient: 'GridLock.',
            }}
            description={t('hero.description')}
            ctaText={t('nav.getStarted')}
            ctaHref="#roles-section"
            onClick={(e) =>
              scrollToSection(e as unknown as React.MouseEvent<HTMLElement>, 'roles-section')
            }
            gridOptions={{
              angle: 65,
              opacity: 0.3,
              cellSize: 60,
              lightLineColor: 'rgba(0,0,0,0.06)',
              darkLineColor: 'rgba(255,255,255,0.06)',
            }}
          >
            {/* CSS Mockup of Command Center */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative mt-16 max-w-5xl mx-auto rounded-xl border border-border/60 bg-background/50 backdrop-blur-2xl shadow-2xl overflow-hidden hidden md:block"
            >
              {/* Mac-like Window Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border/40">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="mx-auto flex items-center gap-2 px-3 py-1 bg-background/80 rounded-md border border-border/30 text-xs text-muted-foreground">
                  <Shield size={12} className="text-primary" />
                  {t('commandCenter.title')}
                </div>
                <div className="w-[42px]" /> {/* Spacer for symmetry */}
              </div>

              {/* App Body */}
              <div className="flex h-[450px]">
                {/* Sidebar */}
                <div className="w-64 border-r border-border/40 bg-muted/10 p-4 flex flex-col gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('commandCenter.liveMetrics')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-background/80 border border-border/40 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">{t('commandCenter.active')}</p>
                        <p className="text-lg font-bold text-red-500">3</p>
                      </div>
                      <div className="bg-background/80 border border-border/40 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">{t('commandCenter.fleet')}</p>
                        <p className="text-lg font-bold text-emerald-500">12/15</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('commandCenter.recentAlerts')}
                    </p>
                    {[
                      {
                        title: t('commandCenter.alert1Title'),
                        loc: t('commandCenter.alert1Loc'),
                        time: t('commandCenter.alert1Time'),
                        color: 'bg-red-500',
                      },
                      {
                        title: t('commandCenter.alert2Title'),
                        loc: t('commandCenter.alert2Loc'),
                        time: t('commandCenter.alert2Time'),
                        color: 'bg-primary',
                      },
                      {
                        title: t('commandCenter.alert3Title'),
                        loc: t('commandCenter.alert3Loc'),
                        time: t('commandCenter.alert3Time'),
                        color: 'bg-emerald-500',
                      },
                    ].map((alert, i) => (
                      <div
                        key={i}
                        className="bg-background/80 border border-border/40 rounded-lg p-2.5 flex gap-3 items-start"
                      >
                        <div className={`w-2 h-2 mt-1 rounded-full ${alert.color}`} />
                        <div>
                          <p className="text-xs font-medium text-foreground">{alert.title}</p>
                          <p className="text-[10px] text-muted-foreground">{alert.loc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden">
                  {/* Map Grid Pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {/* Simulated Map Elements */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full">
                    {/* Arterial Road */}
                    <div className="absolute top-[40%] left-0 w-full h-4 bg-muted/20 border-y border-border/10 transform -rotate-12" />
                    <div className="absolute top-0 left-[60%] w-4 h-full bg-muted/20 border-x border-border/10 transform rotate-12" />

                    {/* Heatmap Bloom */}
                    <div className="absolute top-[35%] left-[55%] w-32 h-32 bg-red-500/20 rounded-full blur-2xl animate-pulse" />
                    <div className="absolute top-[38%] left-[58%] w-16 h-16 bg-red-500/40 rounded-full blur-xl animate-pulse" />

                    {/* Markers */}
                    <div className="absolute top-[38%] left-[58%] flex items-center justify-center">
                      <div className="absolute w-8 h-8 bg-red-500/30 rounded-full animate-ping" />
                      <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-background shadow-lg z-10" />
                    </div>

                    <div className="absolute top-[60%] left-[30%]">
                      <div className="flex items-center gap-1 bg-background/90 px-2 py-1 rounded-full border border-emerald-500/30 shadow-lg">
                        <Navigation size={10} className="text-emerald-500" />
                        <span className="text-[10px] font-medium text-emerald-500">
                          {t('commandCenter.unit')}
                        </span>
                      </div>
                    </div>

                    <div className="absolute top-[25%] left-[70%]">
                      <div className="flex items-center gap-1 bg-background/90 px-2 py-1 rounded-full border border-primary/30 shadow-lg">
                        <Shield size={10} className="text-primary" />
                        <span className="text-[10px] font-medium text-primary">
                          {t('commandCenter.barricade')}
                        </span>
                      </div>
                    </div>

                    {/* Simulated Route Path */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 0 }}
                    >
                      <path
                        d="M 280 270 Q 350 240 500 180"
                        fill="none"
                        stroke="rgba(16, 185, 129, 0.4)"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                      />
                    </svg>
                  </div>

                  {/* Map Controls */}
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <div className="bg-background/90 border border-border/40 rounded-lg p-1.5 text-muted-foreground">
                      <div className="p-1 hover:bg-muted rounded">
                        <ChevronRight size={14} className="-rotate-90" />
                      </div>
                      <div className="h-px bg-border/40 my-0.5" />
                      <div className="p-1 hover:bg-muted rounded">
                        <ChevronRight size={14} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 bg-background/80 px-2 py-1 rounded-md border border-border/30 backdrop-blur-md">
                    <span className="text-[9px] text-muted-foreground font-medium">
                      {t('commandCenter.poweredBy')}
                    </span>
                  </div>

                  {/* System Chatter Terminal */}
                  <SystemChatter />
                </div>
              </div>
            </motion.div>
          </HeroSection>

          {/* ── Glowing Tech Stack Marquee ─────────────────────────────── */}
          <div className="relative flex overflow-hidden border-b border-border/50 bg-muted/10 py-5 z-10 hidden md:flex">
            {/* Glow effects on edges */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-20 pointer-events-none" />

            <motion.div
              className="flex w-max"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ repeat: Infinity, ease: 'linear', duration: 40 }}
            >
              {[0, 1].map((setIndex) => (
                <div key={setIndex} className="flex items-center gap-16 px-8">
                  {[
                    'AI Predictions',
                    'Traffic Simulation',
                    'Smart Routing',
                    'Live Heatmap',
                    'Queue Analysis',
                    'Fast Dispatch',
                    'Live Updates',
                    'Anomaly Detection',
                  ].map((tech, i) => (
                    <span
                      key={i}
                      className="text-sm font-mono font-medium text-primary/60 whitespace-nowrap"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── Trusted By (marquee) ───────────────────────────────────── */}
          {/* <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        className="relative z-10 py-10 border-b border-border/50"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Trusted by leading agencies
        </p>
        <div className="flex items-center justify-center gap-12 flex-wrap px-6">
          {trustedBy.map((name, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="text-sm font-medium text-muted-foreground/60 hover:text-foreground transition-colors cursor-default"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </motion.section> */}

          {/* ── Stats ──────────────────────────────────────────────────── */}
          <section className="relative z-10 py-10 px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={staggerContainer}
              className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {liveStats.map((s, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="text-center flex flex-col items-center gap-2"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <s.icon size={20} strokeWidth={2} />
                  </div>
                  <span className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </span>
                  <span className="text-sm text-muted-foreground">{t(s.labelKey)}</span>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ── Features ───────────────────────────────────────────────── */}
          <section id="features" className="relative py-16 px-6 z-10 bg-muted/20">
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
                className="text-center mb-20"
              >
                <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
                  {t('features.sectionLabel')}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                  {t('features.title')}
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  {t('features.description')}
                </p>
              </motion.div>

              <div className="relative">
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-80px' }}
                  variants={staggerContainer}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {features.map((f, i) => {
                    const isLarge = i === 0 || i === 3
                    return (
                      <motion.div
                        layoutId={`feature-${f.id}`}
                        key={f.id}
                        variants={fadeUp}
                        whileHover={{ y: -4, borderColor: 'hsl(var(--primary) / 0.5)' }}
                        onClick={() => setExpandedFeature(f.id)}
                        className={`group bg-card p-8 md:p-10 flex flex-col gap-4 rounded-3xl border border-border/60 transition-colors duration-300 relative overflow-hidden cursor-pointer ${isLarge ? 'md:col-span-2' : 'md:col-span-1'}`}
                      >
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <motion.div
                          layoutId={`feature-icon-${f.id}`}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center relative z-10 shrink-0"
                        >
                          <f.icon size={24} strokeWidth={2} />
                        </motion.div>
                        <motion.h3
                          layoutId={`feature-title-${f.id}`}
                          className="text-xl font-bold text-foreground relative z-10"
                        >
                          {t(f.titleKey)}
                        </motion.h3>
                        <motion.p
                          layoutId={`feature-desc-${f.id}`}
                          className="text-sm text-muted-foreground leading-relaxed relative z-10"
                        >
                          {t(f.descKey)}
                        </motion.p>

                        <motion.span
                          layoutId={`feature-learn-${f.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-auto pt-4 relative z-10 uppercase tracking-wider"
                        >
                          {t('misc.learnMore')} <ChevronRight size={14} />
                        </motion.span>
                      </motion.div>
                    )
                  })}
                </motion.div>

                <AnimatePresence>
                  {expandedFeature && (
                    <motion.div
                      key="backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-40 bg-background/60 backdrop-blur-md rounded-3xl"
                      onClick={() => setExpandedFeature(null)}
                    />
                  )}

                  {features.map((f) =>
                    f.id === expandedFeature ? (
                      <motion.div
                        layoutId={`feature-${f.id}`}
                        key={`expanded-${f.id}`}
                        className="absolute inset-0 z-50 bg-card p-8 md:p-12 flex flex-col gap-6 rounded-3xl border border-primary/50 shadow-2xl overflow-hidden pointer-events-auto"
                      >
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setExpandedFeature(null)}
                          className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors z-20"
                        >
                          <X size={20} className="text-muted-foreground hover:text-foreground" />
                        </motion.button>

                        <motion.div
                          layoutId={`feature-icon-${f.id}`}
                          className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center relative z-10 shrink-0"
                        >
                          <f.icon size={32} strokeWidth={2} />
                        </motion.div>

                        <motion.h3
                          layoutId={`feature-title-${f.id}`}
                          className="text-3xl font-bold text-foreground relative z-10"
                        >
                          {t(f.titleKey)}
                        </motion.h3>

                        <motion.p
                          layoutId={`feature-desc-${f.id}`}
                          className="text-lg font-medium text-primary/90 relative z-10"
                        >
                          {t(f.descKey)}
                        </motion.p>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="text-base text-muted-foreground leading-relaxed relative z-10 mt-2"
                        >
                          {t(f.detailsKey)}
                        </motion.div>

                        <motion.span
                          layoutId={`feature-learn-${f.id}`}
                          className="block opacity-0 h-0 overflow-hidden"
                        >
                          Hidden learn more
                        </motion.span>
                      </motion.div>
                    ) : null,
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* ── Pipeline Visualizer Demo ──────────────────────────────────────── */}
          <section className="relative py-16 px-6 z-10 bg-muted/10 border-t border-b border-border/50">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center mb-10"
              >
                <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
                  {t('demo.sectionLabel')}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                  {t('demo.title')}
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">{t('demo.description')}</p>
              </motion.div>

              <div className="flex justify-center">
                <div className="w-full max-w-5xl relative">
                  <CircularPipeline isOpen={true} inline={true} autoStart={true} />
                </div>
              </div>
            </div>
          </section>

          {/* ── How It Works ───────────────────────────────────────────── */}
          <section id="how-it-works" className="relative py-16 px-6 z-10">
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center mb-20"
              >
                <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
                  {t('howItWorks.sectionLabel')}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                  {t('howItWorks.title')}
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  {t('howItWorks.description')}
                </p>
              </motion.div>

              <div className="relative max-w-2xl mx-auto mt-12">
                {/* Background track */}
                <div className="absolute left-8 top-6 bottom-0 w-px bg-border/50" />

                {steps.map((s, i) => (
                  <div key={i} className="relative pl-20 pb-12 last:pb-0">
                    {/* The vertical segment that lights up */}
                    {i < steps.length - 1 && (
                      <motion.div
                        className="absolute left-8 top-6 h-full w-px bg-primary origin-top z-10"
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true, margin: '-20%' }}
                        transition={{ duration: 0.8, ease: 'linear' }}
                      />
                    )}

                    {/* Dot background */}
                    <div className="absolute left-[27px] top-6 h-3.5 w-3.5 rounded-full bg-background border-2 border-border z-10" />

                    {/* Dot active state */}
                    <motion.div
                      className="absolute left-[27px] top-6 h-3.5 w-3.5 rounded-full bg-primary z-20"
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, margin: '-20%' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                    />

                    <motion.div
                      className="absolute left-[23px] top-[20px] h-[22px] w-[22px] rounded-full bg-primary/30 blur-sm z-0"
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, margin: '-20%' }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />

                    {/* Content Card */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-20%' }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="bg-card border border-border p-6 rounded-xl hover:border-primary/40 transition-colors relative"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <s.icon size={20} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                            Stage {s.step}
                          </span>
                          <h3 className="text-xl font-bold text-foreground">{t(s.titleKey)}</h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed pl-14">
                        {t(s.descriptionKey)}
                      </p>
                    </motion.div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Role Selection ─────────────────────────────────────────── */}
          <section id="roles-section" className="relative py-16 px-6 z-10 bg-muted/20">
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center mb-16"
              >
                <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
                  {t('roleSelection.sectionLabel')}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                  {t('roleSelection.title')}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('roleSelection.description')}
                </p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Controller */}
                <motion.div
                  variants={scaleIn}
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => navigate('/login/controller')}
                  className="group relative cursor-pointer rounded-2xl border border-border bg-card p-8 md:p-10 overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className="absolute -top-24 -right-24 h-52 w-52 rounded-full bg-primary/6 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  <div className="relative z-10 flex flex-col h-full">
                    <motion.div
                      whileHover={{ rotate: 10 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6"
                    >
                      <Radar size={28} strokeWidth={1.8} />
                    </motion.div>

                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {t('roleSelection.controllerTitle')}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                      {t('roleSelection.controllerDesc')}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8">
                      {['Live Map', 'AI Predictions', 'Event Planning', 'Reports'].map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2.5 py-1 rounded-full bg-primary/8 text-primary font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <button className="group/btn relative w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-2xl hover:shadow-primary/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                      <div className="relative flex items-center justify-between px-6 h-full">
                        <span className="tracking-wider uppercase text-xs">Controller Login</span>
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-background/20 backdrop-blur-sm group-hover/btn:scale-110 group-hover/btn:bg-background/30 transition-all">
                          <ArrowRight
                            size={14}
                            className="group-hover/btn:translate-x-0.5 transition-transform"
                          />
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>

                {/* Fleet */}
                <motion.div
                  variants={scaleIn}
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => navigate('/login/fleet')}
                  className="group relative cursor-pointer rounded-2xl border border-border bg-card p-8 md:p-10 overflow-hidden transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5"
                >
                  <div className="absolute -top-24 -right-24 h-52 w-52 rounded-full bg-emerald-500/6 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  <div className="relative z-10 flex flex-col h-full">
                    <motion.div
                      whileHover={{ rotate: -10 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-6"
                    >
                      <Navigation size={28} strokeWidth={1.8} />
                    </motion.div>

                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      {t('roleSelection.fleetTitle')}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                      {t('roleSelection.fleetDesc')}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8">
                      {['Route Orders', 'Incident Reports', 'Impact Zones', 'Status'].map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    <button className="group/btn relative w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-emerald-600/20 hover:shadow-2xl hover:shadow-emerald-600/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover/btn:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                      <div className="relative flex items-center justify-between px-6 h-full">
                        <span className="tracking-wider uppercase text-xs">Fleet Login</span>
                        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-black/20 backdrop-blur-sm group-hover/btn:scale-110 group-hover/btn:bg-black/30 transition-all">
                          <ArrowRight
                            size={14}
                            className="group-hover/btn:translate-x-0.5 transition-transform text-white"
                          />
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </section>

          {/* ── CTA Banner ─────────────────────────────────────────────── */}
          <section className="relative z-10 py-16 px-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              className="max-w-4xl mx-auto relative rounded-3xl border border-border bg-card overflow-hidden"
            >
              {/* bg accents */}
              <div className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 text-center py-16 px-8">
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                  className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6"
                >
                  <Users size={28} />
                </motion.div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  {t('cta.title')}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                  {t('cta.description')}
                </p>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={(e) => scrollToSection(e, 'roles-section')}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-sm font-medium"
                  >
                    {t('cta.button')}
                    <ArrowRight size={16} className="ml-1" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </section>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <footer className="relative z-10 border-t border-border py-10 bg-background">
            <div className="max-w-5xl mx-auto px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Waypoints size={16} strokeWidth={2.4} />
                  </div>
                  <span className="font-bold text-foreground">GridLock</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <a
                    href="#features"
                    onClick={(e) => scrollToSection(e, 'features')}
                    className="hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                  <a
                    href="#how-it-works"
                    onClick={(e) => scrollToSection(e, 'how-it-works')}
                    className="hover:text-foreground transition-colors"
                  >
                    How It Works
                  </a>
                  <a
                    href="#roles-section"
                    onClick={(e) => scrollToSection(e, 'roles-section')}
                    className="hover:text-foreground transition-colors"
                  >
                    Get Started
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  © <strong className="font-bold text-foreground">Team AlphaQ</strong>.{' '}
                  {t('footer.poweredBy')}
                </p>
              </div>
            </div>
          </footer>
        </div>
      </SmoothScroll>
    </>
  )
}
