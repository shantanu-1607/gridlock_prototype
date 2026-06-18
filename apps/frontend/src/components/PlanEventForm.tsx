import { AlertTriangle, Calendar, ChevronDown, MapPin, Send } from 'lucide-react'
import { FormEvent, useState } from 'react'

import type { PlanEventPayload } from '../types'

const CORRIDORS = [
  'Outer Ring Road',
  'Hosur Road',
  'Bellary Road 1',
  'Bellary Road 2',
  'Old Madras Road',
  'Mysore Road',
  'Tumkur Road',
  'Bannerghata Road',
  'Magadi Road',
  'Old Airport Road',
  'Hennur Main Road',
  'Varthur Road',
  'West of Chord Road',
  'ORR East 1',
  'ORR East 2',
  'ORR North 1',
  'ORR North 2',
  'ORR West 1',
  'CBD 2',
  'Non-corridor',
]

const CATEGORIES = [
  'Accident',
  'Protest',
  'VIP Movement',
  'Water Logging',
  'Tree Fall',
  'Public Event',
  'Procession',
  'Construction',
  'Congestion',
  'Vehicle Breakdown',
  'Road Conditions',
  'Others',
]

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

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
    corridor: 'Outer Ring Road',
    start_datetime: '',
    priority: 'Medium',
    requires_road_closure: false,
    expected_crowd_size: 0,
    type: 'unplanned',
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...form,
      affected_corridors: [form.corridor],
    })
  }

  const update = (field: keyof typeof form, value: string | number | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <form className="plan-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>
          <AlertTriangle size={16} /> Incident Details
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label>Event Name</label>
            <input
              type="text"
              placeholder="e.g. Pipeline burst near Silk Board"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </div>
        </div>
        <div className="form-row two-col">
          <div className="form-group">
            <label>Category</label>
            <div className="select-wrap">
              <select value={form.category} onChange={(e) => update('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
          <div className="form-group">
            <label>Type</label>
            <div className="select-wrap">
              <select value={form.type} onChange={(e) => update('type', e.target.value)}>
                <option value="unplanned">Unplanned</option>
                <option value="planned">Planned</option>
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
        <div className="form-row two-col">
          <div className="form-group">
            <label>Priority</label>
            <div className="priority-pills">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`pill ${form.priority === p ? `active priority-${p.toLowerCase()}` : ''}`}
                  onClick={() => update('priority', p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.requires_road_closure}
                onChange={(e) => update('requires_road_closure', e.target.checked)}
              />
              Requires Road Closure
            </label>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>
          <MapPin size={16} /> Location
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label>Corridor</label>
            <div className="select-wrap">
              <select value={form.corridor} onChange={(e) => update('corridor', e.target.value)}>
                {CORRIDORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
        <div className="form-row two-col">
          <div className="form-group">
            <label>Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={form.lat}
              onChange={(e) => update('lat', parseFloat(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={form.lon}
              onChange={(e) => update('lon', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>
          <Calendar size={16} /> Timing
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date & Time</label>
            <input
              type="datetime-local"
              value={form.start_datetime}
              onChange={(e) => update('start_datetime', e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Description (optional)</label>
          <textarea
            placeholder="Additional context for the command team..."
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? (
          <span className="spinner" />
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
