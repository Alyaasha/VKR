CREATE TABLE IF NOT EXISTS al_queue (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    image_url TEXT NOT NULL,
    suggested_label VARCHAR(50),
    human_label VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'labeled', 'skipped'
    uncertainty_score DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
