-- Barricade recommendations produced by the Barricade Recommendation Engine.
-- Mirrors the fleet_assignments pattern: one row per recommended placement,
-- anchored to a graph junction so it can both render on the map (lat/lon) and
-- feed the propagation simulation (junction_id -> interventions.barricades).
CREATE TABLE IF NOT EXISTS barricades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    junction_id VARCHAR(255) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'hard_closure', -- 'hard_closure' | 'diversion_sign'
    activate_at VARCHAR(50), -- relative label, e.g. 'T-20 mins'
    purpose TEXT,
    rule_source VARCHAR(50), -- which rule generated it: 'road_closure' | 'severity_path' | 'crowd_perimeter'
    status VARCHAR(50) DEFAULT 'recommended' CHECK (status IN ('recommended', 'confirmed', 'removed')),
    assigned_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_barricades_updated_at ON barricades;

CREATE TRIGGER update_barricades_updated_at
BEFORE UPDATE ON barricades
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Barricade recommendation metadata on events (mirrors recommendation_* fields)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS barricade_rationale TEXT,
ADD COLUMN IF NOT EXISTS total_barricades_required INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_barricades_event_id ON barricades(event_id);
