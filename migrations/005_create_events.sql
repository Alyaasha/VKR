CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES cameras(id),
    track_id INTEGER REFERENCES tracks(id),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    clip_url TEXT,
    snapshot_url TEXT,
    metadata JSONB
);

-- Note: Partitioning usually requires a slightly different syntax depending on the PG version,
-- but for the prototype we'll keep it simple or use a trigger-based approach if needed.
-- For now, we'll just index the timestamp.
CREATE INDEX idx_events_timestamp ON events(timestamp);
