-- Add planning pipeline fields to events table
-- Stores ML predictions, queueing analysis, and deployment plans

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    predicted_duration_mins NUMERIC(8, 2);

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    blocking_probability NUMERIC(5, 4);

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    risk_level VARCHAR(20);

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    queue_length NUMERIC(8, 1);

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    time_to_spillover NUMERIC(8, 1);

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    deployment_plan JSONB DEFAULT '{}';

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    gating_plan JSONB DEFAULT '{}';

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    similar_incidents JSONB DEFAULT '[]';

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    propagation_forecast JSONB DEFAULT '{}';

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    prestaging_timeline JSONB DEFAULT '[]';

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    anomaly_score NUMERIC(6, 4);

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    anomaly_label VARCHAR(30);

ALTER TABLE events ADD COLUMN IF NOT EXISTS
    counterfactual JSONB DEFAULT '{}';

-- Index for quick lookup of planned/upcoming events
CREATE INDEX IF NOT EXISTS idx_events_status_type
    ON events(status, type);

CREATE INDEX IF NOT EXISTS idx_events_start_datetime
    ON events(start_datetime);
