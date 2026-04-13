-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'operator',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cameras table
CREATE TABLE cameras (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'active',
    last_heartbeat TIMESTAMP WITH TIME ZONE
);

-- 3. Events (Incidents) table
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES cameras(id),
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    clip_url TEXT,
    embedding vector(128) -- For similarity search
);

-- 4. Tracks table (Historical)
CREATE TABLE tracks (
    id SERIAL PRIMARY KEY,
    object_id VARCHAR(100) NOT NULL,
    object_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    avg_speed DOUBLE PRECISION,
    path_geometry JSONB -- Array of coordinates
);

-- 5. System Metrics
CREATE TABLE system_metrics (
    id SERIAL PRIMARY KEY,
    component VARCHAR(50),
    metric_name VARCHAR(50),
    value DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Model Metadata
CREATE TABLE model_versions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    version VARCHAR(20),
    mAP DOUBLE PRECISION,
    weights_path TEXT,
    deployed_at TIMESTAMP WITH TIME ZONE
);

-- HNSW Index for vector search
CREATE INDEX ON events USING hnsw (embedding vector_l2_ops);
