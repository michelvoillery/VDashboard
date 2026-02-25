# Homelab Dashboard

A sleek, highly customizable dashboard for managing and monitoring your homelab services.

## ✨ Features

- **Categorized Sections:** Organize your services into logical groups.
- **Drag & Drop:** Reorder services or move them between sections in Edit Mode.
- **Live Status Monitoring:** Automatic ICMP (Ping) and TCP (Port) connectivity checks.
- **Deep Customization:** Control colors, fonts, sizes, transparency, and background images.
- **Custom Icons:** Library support via CDN or direct file upload.
- **Production Ready:** Integrated Docker container with persistent storage.

---

## 🐳 Docker Deployment (Recommended)

The easiest way to run the dashboard is via Docker.

### 1. Start the Container
From the root directory:
```bash
docker-compose up -d --build
```
The dashboard will be live at `http://localhost:3001`.

### 2. Backup & Migration
All configuration and uploaded assets are stored in the `./data` folder on your host.
- **Backup:** Copy the `./data` folder.
- **Reset:** Delete `data/config.json` and restart the container.
- **Migration:** Move the project files + your `data` folder to a new server and run `docker-compose up -d`.

---

## 🚀 Development Setup

If you want to run the code without Docker:

1. **Install Dependencies:**
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```
2. **Start Services:**
   ```bash
   npm run dev
   ```
   *Note: Requires both ports 3001 and 5173 to be free.*

---

## 📝 Gemini Project Notes (Context for Future Sessions)

### Architecture
- **Tech Stack:** React (Vite) + Node.js (Express).
- **Storage:** Flat-file JSON (`data/config.json`) for settings and service definitions.
- **Networking:** 
  - Frontend uses a Vite Proxy (`/api`) in development.
  - Server hosts the production build (`client/dist`) using `express.static`.
  - **Important:** Express is pinned to `^4.18.2` to support the simple `*` wildcard for catch-all routing (Express 5 has strict `path-to-regexp` rules that cause crashes with `*`).

### Key Logic
- **Migration:** `server/index.js` contains a GET handler that migrates old flat `services` arrays into the new `sections` object structure on-the-fly.
- **Connectivity:** The `/api/status` endpoint handles bulk status checks. It detects ports (`:`) to choose between `ping` (ICMP) or `net.connect` (TCP).
- **Persistence:** POST `/api/config` has safety checks to prevent overwriting `config.json` with empty data if the frontend fails to load the state correctly.

### File Structure
- `/client`: React source code and Vite config.
- `/server`: Express API and production hosting logic.
- `/data`: Volume-mapped storage for JSON config, backgrounds, and custom icons.
- `Dockerfile`: Multi-stage build (Node 20-slim).
