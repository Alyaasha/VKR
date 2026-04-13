import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API v1 Endpoints (Mock Implementation for Prototype) ---

  // /api/v1/stats - General system statistics
  app.get("/api/v1/stats", (req, res) => {
    res.json({
      active_tracks: 124,
      conflicts_24h: 42,
      avg_speed: "5.2 km/h",
      system_load: "64%",
      uptime: "12d 4h 12m"
    });
  });

  // /api/v1/events - Recent incidents/events
  app.get("/api/v1/events", (req, res) => {
    res.json([
      { id: 1, type: 'Сближение', object: 'Робот #42', time: '10:12', severity: 'high', desc: 'Дистанция < 0.5м' },
      { id: 2, type: 'Манёвр', object: 'Курьер (СИМ)', time: '10:25', severity: 'medium', desc: 'Резкое торможение' },
      { id: 3, type: 'Зона', object: 'Велосипедист', time: '10:44', severity: 'low', desc: 'Заезд на детскую площадку' },
    ]);
  });

  // /api/v1/tracks - Active trajectories
  app.get("/api/v1/tracks", (req, res) => {
    // Mock trajectories for Leaflet
    res.json({
      pedestrians: [
        [[55.756, 37.615], [55.757, 37.618], [55.758, 37.620]],
        [[55.754, 37.616], [55.755, 37.619], [55.756, 37.622]],
      ],
      couriers: [
        [[55.753, 37.610], [55.755, 37.615], [55.758, 37.625]],
      ],
      robots: [
        [[55.757, 37.613], [55.757, 37.623]],
      ]
    });
  });

  // /api/v1/heatmap - Density data
  app.get("/api/v1/heatmap", (req, res) => {
    res.json([
      { lat: 55.756, lng: 37.618, intensity: 0.8 },
      { lat: 55.754, lng: 37.620, intensity: 0.5 }
    ]);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
