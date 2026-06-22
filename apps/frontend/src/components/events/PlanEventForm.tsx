import { AlertTriangle, Calendar, ChevronDown, Loader2, MapPin, Search, Send } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'

import {
  CATEGORIES,
  CORRIDORS,
  DEFAULT_CORRIDOR,
  PRIORITIES,
  PRIORITY_CLASSES,
} from '../../config/planning'
import type { PlanEventPayload } from '../../types'
import { autosuggest, type MapplsSuggestion } from '../../utils/mappls'

interface Props {
  onSubmit: (payload: PlanEventPayload) => void
  loading: boolean
}

export default function PlanEventForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState({
    name: '',
    category: 'Accident',
    description: '',
    lat: 12.9716,
    lon: 77.5946,
    corridor: DEFAULT_CORRIDOR,
    start_datetime: '',
    priority: 'Medium',
    requires_road_closure: false,
    expected_crowd_size: 0,
    type: 'unplanned',
  })

  // Autosuggest State
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<MapplsSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Only search if user typed more than 2 chars and it doesn't match the selected location
      if (searchQuery.length >= 3) {
        setIsSearching(true)
        const results = await autosuggest(searchQuery)
        setSuggestions(results)
        setIsSearching(false)
      } else {
        setSuggestions([])
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    // Field-level validation — guards against NaN/empty values reaching the pipeline.
    const lat = Number(form.lat)
    const lon = Number(form.lon)
    if (!form.name.trim()) return setValidationError('Please enter an event name.')
    if (!form.start_datetime) return setValidationError('Please set a start date and time.')
    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      (lat === 0 && lon === 0) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      return setValidationError('Please pick a valid location (search or tap the map).')
    }
    if (Number(form.expected_crowd_size) < 0) {
      return setValidationError('Expected crowd size cannot be negative.')
    }
    setValidationError(null)

    // Ensure the date is sent with the correct absolute UTC offset
    const isoStartDateTime = form.start_datetime
      ? new Date(form.start_datetime).toISOString()
      : new Date().toISOString()

    onSubmit({
      ...form,
      start_datetime: isoStartDateTime,
      affected_corridors: [form.corridor],
    })
  }

  const update = (field: keyof typeof form, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSelectSuggestion = (s: MapplsSuggestion) => {
    update('lat', s.latitude)
    update('lon', s.longitude)
    setSearchQuery(s.placeName)
    setSuggestions([]) // Close dropdown
  }

  const inputClass =
    'w-full rounded-md border border-border bg-input px-2.5 py-2 text-[13px] text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_2px_rgba(59,130,246,0.12)]'
  const labelClass =
    'block text-[11px] font-medium tracking-wider text-muted-foreground uppercase mb-1'

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {/* Incident Details */}
      <div className="rounded-lg border border-border bg-card p-3.5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
          <AlertTriangle size={14} /> Incident Details
        </h3>

        <div className="mb-2.5">
          <label className={labelClass}>Event Name</label>
          <input
            type="text"
            placeholder="e.g. Pipeline burst near Silk Board"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="mb-2.5 grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelClass}>Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className={`${inputClass} appearance-none pr-7`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <div className="relative">
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className={`${inputClass} appearance-none pr-7`}
              >
                <option value="unplanned">Unplanned</option>
                <option value="planned">Planned</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-rows-2">
          <div>
            <label className={labelClass}>Priority</label>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                    form.priority === p
                      ? PRIORITY_CLASSES[p]
                      : 'border-border bg-input text-muted-foreground hover:border-primary/50'
                  }`}
                  onClick={() => update('priority', p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex h-9 items-end">
            <label className="flex cursor-pointer items-center gap-2 pb-1">
              <input
                type="checkbox"
                checked={form.requires_road_closure}
                onChange={(e) => update('requires_road_closure', e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              <span className="text-xs text-muted-foreground">Requires Road Closure</span>
            </label>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-lg border border-border bg-card p-3.5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
          <MapPin size={14} /> Location
        </h3>

        <div className="mb-2.5">
          <label className={labelClass}>Corridor</label>
          <div className="relative">
            <select
              value={form.corridor}
              onChange={(e) => update('corridor', e.target.value)}
              className={`${inputClass} appearance-none pr-7`}
            >
              {CORRIDORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
            />
          </div>
        </div>

        <div className="relative" ref={searchContainerRef}>
          <label className={labelClass}>Search Location</label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="e.g. M. Chinnaswamy Stadium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-8`}
            />
            {isSearching && (
              <Loader2
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
              />
            )}
          </div>

          {/* Floating Professional Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 top-full z-[100] mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl animate-in fade-in slide-in-from-top-2">
              <div className="max-h-[250px] overflow-y-auto p-1">
                {suggestions.map((s, idx) => (
                  <button
                    key={s.eLoc || idx}
                    type="button"
                    className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted focus:bg-muted focus:outline-none"
                    onClick={() => handleSelectSuggestion(s)}
                  >
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <MapPin size={12} />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {s.placeName}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {s.placeAddress}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected coordinates preview */}
          <div className="mt-2 flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5">
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              Coordinates
            </span>
            <span className="font-mono text-[11px] font-semibold text-foreground">
              {form.lat.toFixed(4)}, {form.lon.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Timing */}
      <div className="rounded-lg border border-border bg-card p-3.5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
          <Calendar size={14} /> Timing
        </h3>
        <div>
          <label className={labelClass}>Start Date & Time</label>
          <input
            type="datetime-local"
            value={form.start_datetime}
            onChange={(e) => update('start_datetime', e.target.value)}
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description (optional)</label>
        <textarea
          placeholder="Additional context for the command team..."
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={2}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Validation message */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle size={14} className="shrink-0" />
          {validationError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-primary/90 to-primary py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={loading}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            <Send size={16} />
            Run Predictive Pipeline
          </>
        )}
      </button>
    </form>
  )
}
