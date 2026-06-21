import { motion, type Variants } from 'framer-motion'
import {
  FileBarChart,
  Gauge,
  History,
  Map,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard/map', label: 'Live Map', icon: Map },
  { to: '/dashboard/overview', label: 'Overview', icon: Gauge },
  { to: '/dashboard/performance', label: 'Performance', icon: SlidersHorizontal },
  { to: '/dashboard/reports', label: 'Reports', icon: FileBarChart },
  { to: '/dashboard/history', label: 'History', icon: History },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
] as const

const sidebarVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] },
  },
}

interface AppSidebarProps {
  chatOpen: boolean
  onChatToggle: () => void
}

export default function AppSidebar({ chatOpen, onChatToggle }: AppSidebarProps) {
  const location = useLocation()

  return (
    <motion.nav
      initial="hidden"
      animate="visible"
      variants={sidebarVariants}
      className="flex h-full w-[200px] shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur-sm px-3 py-4"
    >
      <motion.span
        variants={itemVariants}
        className="px-3 pb-3 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
      >
        Navigation
      </motion.span>

      <div className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to
          return (
            <motion.div key={to} variants={itemVariants}>
              <NavLink
                to={to}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon size={16} className="shrink-0" />
                {label}
              </NavLink>
            </motion.div>
          )
        })}
      </div>

      {/* AI Assistant Button */}
      <div className="mt-auto pt-4">
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onChatToggle}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all duration-300 relative group overflow-hidden border',
            chatOpen
              ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20'
              : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 hover:border-primary/30',
          )}
        >
          <Sparkles
            className={cn(
              'w-4 h-4 shrink-0 transition-transform duration-300 group-hover:rotate-12',
              chatOpen ? 'text-primary-foreground' : 'text-primary',
            )}
          />
          <span>AI Assistant</span>

          {!chatOpen && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
          )}
        </motion.button>
      </div>
    </motion.nav>
  )
}
