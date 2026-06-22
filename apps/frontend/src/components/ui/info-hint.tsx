import { AnimatePresence, motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

/**
 * A small "i" affordance that explains a metric or section in plain language.
 *
 * Opens on hover or keyboard focus (desktop) and on tap (touch — tap again or tap
 * outside to dismiss). Built for non-technical operators: `what` is the headline
 * (always shown) and `why` is an optional supporting line. Rendered as a fixed,
 * viewport-clamped panel that flips above the trigger when there isn't room below,
 * so it is never clipped at the edge of a tab.
 */
interface InfoHintProps {
  /** Plain-language description of the metric. Required, kept simple. */
  what: string
  /** Optional: why it matters operationally. */
  why?: string
  /** Optional heading shown at the top of the panel (the metric name). */
  title?: string
  className?: string
  iconClassName?: string
}

const PANEL_W = 280
const MARGIN = 10

export default function InfoHint({ what, why, title, className, iconClassName }: InfoHintProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom')
  const pinnedRef = useRef(false)
  const hideTimer = useRef<number | undefined>(undefined)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const id = useId()

  const reposition = () => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const panelH = panelRef.current?.offsetHeight ?? 140

    let left = r.left + r.width / 2 - PANEL_W / 2
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - PANEL_W - MARGIN))

    const spaceBelow = window.innerHeight - r.bottom - MARGIN
    // Prefer below; flip above when there isn't room and there's more room up top.
    const openBelow = spaceBelow >= panelH || spaceBelow >= r.top
    let top = openBelow ? r.bottom + MARGIN : r.top - MARGIN - panelH
    top = Math.max(MARGIN, Math.min(top, window.innerHeight - panelH - MARGIN))

    setPlacement(openBelow ? 'bottom' : 'top')
    setPos({ top, left })
  }

  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = undefined
    }
  }
  const show = () => {
    clearHide()
    setOpen(true)
    reposition()
  }
  // Small grace period so the pointer can travel into the panel without it closing.
  const scheduleHide = () => {
    if (pinnedRef.current) return
    clearHide()
    hideTimer.current = window.setTimeout(() => setOpen(false), 140)
  }

  // Re-measure once the panel has mounted, so the flip uses its real height.
  useLayoutEffect(() => {
    if (open) reposition()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        pinnedRef.current = false
        setOpen(false)
      }
    }
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
      pinnedRef.current = false
      setOpen(false)
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <span className={`relative inline-flex ${className ?? ''}`}>
      <button
        ref={btnRef}
        type="button"
        aria-label={title ? `What is ${title}?` : 'More information'}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        className={`inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${iconClassName ?? ''}`}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          pinnedRef.current = !pinnedRef.current
          if (pinnedRef.current) show()
          else setOpen(false)
        }}
      >
        <Info size={13} strokeWidth={2.5} />
      </button>

      <AnimatePresence>
        {open && pos && (
          <motion.div
            ref={panelRef}
            role="tooltip"
            id={id}
            initial={{ opacity: 0, scale: 0.95, y: placement === 'bottom' ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: placement === 'bottom' ? -6 : 6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: PANEL_W,
              maxHeight: `calc(100vh - ${MARGIN * 2}px)`,
              transformOrigin: placement === 'bottom' ? 'top center' : 'bottom center',
            }}
            className="z-[100] overflow-y-auto rounded-xl border border-border bg-popover p-3.5 text-left text-popover-foreground shadow-2xl ring-1 ring-black/5"
            onMouseEnter={clearHide}
            onMouseLeave={scheduleHide}
          >
            {title && (
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
                {title}
              </p>
            )}
            <p className="text-[13px] font-medium leading-relaxed text-foreground">{what}</p>
            {why && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{why}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
