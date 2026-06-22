import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

/**
 * A small "i" affordance that explains a metric or section in plain language.
 *
 * Opens on hover or keyboard focus (desktop) and on tap (touch — tap again or tap
 * outside to dismiss). Built for non-technical operators: `what` is the headline
 * (always shown), with optional `how`/`why` as supporting detail. Rendered as a
 * fixed-position panel clamped to the viewport so it is never clipped by a card.
 */
interface InfoHintProps {
  /** Plain-language description of the metric. Required, kept simple. */
  what: string
  /** Optional: how the number is produced. */
  how?: string
  /** Optional: why it matters operationally. */
  why?: string
  /** Optional heading shown at the top of the panel (the metric name). */
  title?: string
  className?: string
  iconClassName?: string
}

const PANEL_W = 288

export default function InfoHint({
  what,
  how,
  why,
  title,
  className,
  iconClassName,
}: InfoHintProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const pinnedRef = useRef(false)
  const hideTimer = useRef<number | undefined>(undefined)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const id = useId()

  const place = () => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let left = r.left + r.width / 2 - PANEL_W / 2
    left = Math.max(8, Math.min(left, window.innerWidth - PANEL_W - 8))
    setPos({ top: r.bottom + 8, left })
  }

  const clearHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = undefined
    }
  }
  const show = () => {
    clearHide()
    place()
    setOpen(true)
  }
  // Small grace period so the pointer can travel into the panel without it closing.
  const scheduleHide = () => {
    if (pinnedRef.current) return
    clearHide()
    hideTimer.current = window.setTimeout(() => setOpen(false), 140)
  }

  useEffect(() => {
    if (!open) return
    const reposition = () => place()
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

      {open && pos && (
        <div
          ref={panelRef}
          role="tooltip"
          id={id}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: PANEL_W }}
          className="z-[100] rounded-lg border border-border bg-popover p-3 text-left text-popover-foreground shadow-xl"
          onMouseEnter={clearHide}
          onMouseLeave={scheduleHide}
        >
          {title && (
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              {title}
            </p>
          )}
          <p className="text-xs font-normal normal-case leading-relaxed text-foreground">{what}</p>
          {how && (
            <p className="mt-2 text-xs font-normal normal-case leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground/80">How: </span>
              {how}
            </p>
          )}
          {why && (
            <p className="mt-1.5 text-xs font-normal normal-case leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground/80">Why: </span>
              {why}
            </p>
          )}
        </div>
      )}
    </span>
  )
}
