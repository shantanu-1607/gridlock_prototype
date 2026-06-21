-- Persist the full ML prediction detail so re-selecting / background-syncing a saved
-- event shows the model's REAL output (confidence, conformal interval, ensemble factors,
-- full queue incl. tandem, full anomaly) instead of "—" or scalar-only fallbacks on reload.
-- Additive + nullable; safe to re-run.

ALTER TABLE events ADD COLUMN IF NOT EXISTS confidence NUMERIC(5, 4);
ALTER TABLE events ADD COLUMN IF NOT EXISTS prediction_interval JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS confidence_factors JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS queue_analysis JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS anomaly_detection JSONB;
