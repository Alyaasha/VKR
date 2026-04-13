CREATE TABLE IF NOT EXISTS zones (
    id SERIAL PRIMARY KEY,
    camera_id INTEGER REFERENCES cameras(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'forbidden', 'restricted', 'pedestrian'
    polygon_geometry JSONB NOT NULL, -- Array of points [[x,y], ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
