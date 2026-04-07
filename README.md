<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PantryPal - Smart Inventory & Ledger

A smart pantry inventory management app with receipt scanning, AI-powered usage detection, and subscription management.

## Documentation

- **[TESTING.md](TESTING.md)** - Complete guide for testing, building, and troubleshooting
- **[DEPLOY.md](DEPLOY.md)** - Railway deployment and production setup guide

## Quick Start

### Prerequisites

- **Node.js** v18+ (recommended: v20+ LTS)
- **npm** (comes with Node.js)

### 1. Clone and Setup

```bash
# Install dependencies
npm install

# The backend is in a separate folder (../pantry-pal-api)
cd ../pantry-pal-api && npm install
```

### 2. Configure Environment

**Frontend** (`.env.local`):
```bash
# Copy the template (already configured for local dev)
# Edit if needed for your network setup
cat .env.local
```

**Backend** (`../pantry-pal-api/.env.local`):
```bash
# Copy the template (already configured for SQLite)
cat ../pantry-pal-api/.env.local
```

### 3. Start Development Servers

**Option A: SQLite (Default - No Docker)**

```bash
# Terminal 1: Start Backend
# Note: This will create a SQLite database at ./data/pantry.db
cd ../pantry-pal-api && npm run dev

# Terminal 2: Start Frontend
cd /path/to/pantry-pal && npm run dev
```

**Option B: PostgreSQL (with Docker)**

```bash
# Terminal 1: Start PostgreSQL and Backend
cd ../pantry-pal-api
npm run db:up        # Start PostgreSQL in Docker
npm run db:migrate   # Run database migrations
npm run dev:postgres # Start backend with PostgreSQL

# Terminal 2: Start Frontend
cd /path/to/pantry-pal && npm run dev
```

### 4. Access the App

- **Frontend**: https://localhost:5173
- **Backend**: https://localhost:3001
- **Health Check**: https://localhost:3001/health

### Mobile & Local Network Testing

To use PantryPal on your phone or other devices on your Wi-Fi:

1. **Find your Local IP**: Run `ifconfig | grep inet` (usually `192.168.x.x`).
2. **Update Frontend Config**: In `pantry-pal/.env.local`, set:
   ```bash
   VITE_API_URL=https://<YOUR_IP>:3001
   ```
3. **Update Backend Config**: In `pantry-pal-api/.env.local`, set:
   ```bash
   CORS_ORIGINS=https://<YOUR_IP>:5173
   ```
4. **Start Servers**:
   - Backend: `npm run dev` (starts on port 3001)
   - Frontend: `npx vite --host` (starts on port 5173)
5. **Accept Certificates**:
   - Visit `https://<YOUR_IP>:3001/health` on your phone first and "Accept Risk/Proceed" to trust the local SSL cert.
   - Then visit `https://<YOUR_IP>:5173` to use the app.

### Remote Access (ngrok)

If you need to access the app outside your local network (e.g., on cellular data), use ngrok:

1. **Start ngrok for Backend**:
   ```bash
   ngrok http https://localhost:3001
   ```
2. **Start ngrok for Frontend**:
   ```bash
   ngrok http https://localhost:5173
   ```
3. **Update Config**: Update `.env.local` to use the new ngrok URLs. ngrok provides valid HTTPS certificates, so you won't have certificate warnings.

### Troubleshooting HTTPS/SSL
If the frontend can't talk to the backend, ensure you have visited the backend URL (`:3001/health`) directly in the same browser session to bypass the self-signed certificate warning.


## Project Structure

```
pantry-pal/                    # Frontend (this folder)
├── .env.local                 # Local dev environment variables
├── .env.production.template   # Template for production
├── services/
│   └── apiService.ts          # API client
├── package.json
└── README.md

../pantry-pal-api/             # Backend API
├── .env.local                 # Local dev environment variables
├── .env.production.template   # Template for production
├── src/
│   ├── db/                    # Database adapters (SQLite & PostgreSQL)
│   ├── routes/                # API endpoints
│   ├── services/              # Business logic
│   └── server.ts              # Express server
├── scripts/
│   └── migrate-sqlite-to-postgres.ts  # Migration script
├── data/                      # SQLite database (dev only)
└── package.json
```

## Environment Modes

| Mode | Database | Use Case |
|------|----------|----------|
| `npm run dev` | SQLite | Quick local development, no Docker needed |
| `npm run dev:postgres` | PostgreSQL | Testing production-like environment |
| `npm start` (backend) | PostgreSQL | Production on Railway |

## Deployment to Railway

See **[DEPLOY.md](DEPLOY.md)** for detailed deployment instructions including:
- Railway project setup
- Environment variable configuration
- Database migration
- Domain configuration

## Scripts Reference

### Frontend (pantry-pal)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (https://localhost:5173) |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build locally |

### Backend (pantry-pal-api)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with SQLite (default) |
| `npm run dev:postgres` | Start with PostgreSQL |
| `npm run dev:sqlite` | Start with SQLite (explicit) |
| `npm run db:up` | Start PostgreSQL in Docker |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:migrate` | Run database migrations |
| `npm run db:migrate-sqlite` | Migrate SQLite data to PostgreSQL |
| `npm run build` | Build TypeScript |
| `npm start` | Start production server |

## Database Support

### SQLite (Default for Local Dev)

- **Pros**: No Docker needed, instant setup, file-based
- **Cons**: Not for production
- **Location**: `../pantry-pal-api/data/pantry.db`

### PostgreSQL (Production & Local Testing)

- **Pros**: Production-grade, concurrent connections, Railway-native
- **Cons**: Requires Docker or external database
- **Setup**: `npm run db:up` in backend folder

### Migrating Data

To migrate from SQLite to PostgreSQL:

```bash
cd ../pantry-pal-api

# Ensure PostgreSQL is running
npm run db:up

# Run migrations
npm run db:migrate

# Migrate data from SQLite
npm run db:migrate-sqlite

# Verify counts match, then switch to PostgreSQL
npm run dev:postgres
```

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Clerk Auth
- **Backend**: Express + TypeScript + SQLite/PostgreSQL
- **AI**: Gemini API for smart features
- **Payments**: Stripe for subscriptions
- **Deployment**: Railway

## License

MIT
