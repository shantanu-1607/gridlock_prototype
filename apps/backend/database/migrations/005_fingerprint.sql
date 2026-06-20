-- Persist the event-fingerprint summary (aggregate + search metadata) alongside
-- the per-incident matches already stored in similar_incidents. This lets the
-- Detailed Reports "Event Fingerprint" card re-hydrate for historical events,
-- not just freshly-planned ones.
--
-- Shape: { "aggregated": { avg/min/max_duration_mins, avg_severity_score, count },
--          "meta": { corpus_size, n_candidates, cause_matched, hour_window_relaxed } }

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    fingerprint_summary JSONB DEFAULT '{}';
