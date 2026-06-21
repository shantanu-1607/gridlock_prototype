import { motion, useInView, type Variants } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  MapPin,
  Navigation,
  Radar,
  Send,
  Shield,
  TrendingDown,
  Users,
  Waypoints,
  Zap,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { HeroSection } from '@/components/ui/hero-section-dark'
import { ThemeToggle } from '@/components/ui/theme-toggle'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    title: 'Real-time Analytics',
    description:
      'Monitor city-wide traffic patterns and congestion levels in real-time with our advanced AI analytics engine.',
    icon: Activity,
  },
  {
    title: 'Smart Routing',
    description:
      'Context-aware route optimization for field units based on live incident and congestion data.',
    icon: MapPin,
  },
  {
    title: 'Instant Deployment',
    description:
      'Dispatch resources to high-priority zones with one-click automated deployment workflows.',
    icon: Zap,
  },
  {
    title: 'Deep Insights',
    description:
      'Comprehensive reports and historical trend analysis to drive smarter infrastructure decisions.',
    icon: BarChart3,
  },
]

const stats = [
  { value: 40, suffix: '%', label: 'Congestion Reduction', icon: TrendingDown },
  { value: 12, suffix: 's', label: 'Avg. Response Time', icon: Clock },
  { value: 500, suffix: '+', label: 'Intersections Monitored', icon: Eye },
  { value: 99.9, suffix: '%', label: 'System Uptime', icon: Shield },
]

const steps = [
  {
    step: '01',
    title: 'Ingest & Monitor',
    description:
      'Live feeds from 500+ sensors, cameras, and GPS units flow into the platform. AI models detect anomalies in seconds.',
    icon: Brain,
  },
  {
    step: '02',
    title: 'Analyze & Predict',
    description:
      'Machine learning pipelines forecast congestion 30 minutes ahead, identify bottlenecks, and score incident severity.',
    icon: Activity,
  },
  {
    step: '03',
    title: 'Command & Deploy',
    description:
      'Controllers issue directives from a unified dashboard. Fleet units receive optimized routes on their mobile workspace.',
    icon: Send,
  },
  {
    step: '04',
    title: 'Resolve & Report',
    description:
      'Field officers close incidents in real-time. The system auto-generates detailed after-action reports and trend analytics.',
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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const navigate = useNavigate()

  const scrollToRoles = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById('roles-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative flex flex-col bg-background font-sans">
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
            className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How It Works
          </a>
          <a
            href="#roles-section"
            className="hidden md:inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Get Started
          </a>
          <div className="w-px h-5 bg-border hidden md:block" />
          <ThemeToggle />
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <HeroSection
        title="Welcome to GridLock"
        subtitle={{
          regular: 'AI-Powered Traffic ',
          gradient: 'Command Center.',
        }}
        description="Predict, manage, and mitigate urban congestion in real-time. Unify your command center and field operations on one intelligent platform."
        ctaText="Get Started"
        ctaHref="#roles-section"
        onClick={scrollToRoles as unknown as React.MouseEventHandler<HTMLDivElement>}
        gridOptions={{
          angle: 65,
          opacity: 0.3,
          cellSize: 60,
          lightLineColor: 'rgba(0,0,0,0.06)',
          darkLineColor: 'rgba(255,255,255,0.06)',
        }}
      />

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
      <section className="relative z-10 py-20 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {stats.map((s, i) => (
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
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" className="relative py-28 px-6 z-10 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            className="text-center mb-20"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
              Platform Capabilities
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Everything you need for smarter cities
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Built for scale. Designed for the chaos of real-world traffic management.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60"
          >
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ backgroundColor: 'var(--muted)' }}
                className="group bg-background p-8 md:p-10 flex flex-col gap-4 transition-colors duration-300"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"
                >
                  <f.icon size={22} strokeWidth={2} />
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                <motion.span
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary cursor-pointer mt-auto pt-2"
                >
                  Learn more <ChevronRight size={14} />
                </motion.span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-28 px-6 z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-20"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              From raw data to resolved incidents
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Four seamless stages power the GridLock pipeline, end to end.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {steps.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="group relative rounded-2xl border border-border bg-card p-8 hover:border-primary/40 transition-colors duration-300 overflow-hidden"
              >
                {/* step number watermark */}
                <span className="absolute top-4 right-6 text-7xl font-black text-muted/40 select-none pointer-events-none">
                  {s.step}
                </span>

                <div className="relative z-10">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                    <s.icon size={22} strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Role Selection ─────────────────────────────────────────── */}
      <section id="roles-section" className="relative py-28 px-6 z-10 bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
              Choose Your Role
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Select your workspace
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Two dedicated interfaces. One unified mission.
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

                <h3 className="text-2xl font-bold text-foreground mb-2">Command Center</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                  For traffic controllers. Monitor city-wide traffic, plan events, and deploy
                  resources via the AI pipeline.
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

                <Button className="w-full justify-between bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-sm font-medium">
                  Controller Login
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform duration-200"
                  />
                </Button>
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

                <h3 className="text-2xl font-bold text-foreground mb-2">Field Operations</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                  For fleet officers. Receive routing orders, view impact zones, and report
                  incidents directly from the field.
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

                <Button className="w-full justify-between bg-emerald-600 text-white hover:bg-emerald-600/90 h-12 text-sm font-medium">
                  Fleet Login
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform duration-200"
                  />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────── */}
      <section className="relative z-10 py-24 px-6">
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
              Ready to transform your city&apos;s traffic?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Join the growing network of municipalities using GridLock to build safer, faster, and
              smarter transportation systems.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() =>
                  document.getElementById('roles-section')?.scrollIntoView({ behavior: 'smooth' })
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-sm font-medium"
              >
                Get Started Now
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
              <a href="#features" className="hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#roles-section" className="hover:text-foreground transition-colors">
                Get Started
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">MapMyIndia</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
