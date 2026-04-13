CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tracks (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    object_id VARCHAR(100) NOT NULL,
    object_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    avg_speed DOUBLE PRECISION,
    path_geometry JSONB, -- Array of coordinates with timestamps
    embedding vector(128) -- Feature vector for ReID
);

CREATE INDEX ON tracks USING hnsw (embedding vector_l2_ops);
