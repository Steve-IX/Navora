# Quick Setup Guide

This guide will help you get the GPS Mapping Application up and running quickly.

## Prerequisites

1. **Node.js 18+** and npm 9+
2. **PostgreSQL** with PostGIS extension (or use Docker)
3. **Mapbox Access Token** ([Get one here](https://account.mapbox.com/))

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install shared package dependencies
cd shared
npm install
npm run build
cd ..

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install:all
```

### 2. Set Up Database

**Option A: Using Docker (Recommended)**
```bash
docker-compose up -d postgres
```

**Option B: Local PostgreSQL**
```sql
-- Connect to PostgreSQL and run:
CREATE DATABASE gps_mapping;
\c gps_mapping
CREATE EXTENSION postgis;
```

### 3. Configure Environment Variables

Create the following files with your configuration:

**Root `.env`:**
```env
MAPBOX_ACCESS_TOKEN=your-mapbox-token-here
```

**`backend/.env`:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=gps_mapping
JWT_SECRET=your-secret-key-here
MAPBOX_ACCESS_TOKEN=your-mapbox-token-here
FRONTEND_URL=http://localhost:5173
```

**`frontend/.env`:**
```env
VITE_API_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=your-mapbox-token-here
```

### 4. Start the Application

**Development Mode:**

In separate terminals:
```bash
# Terminal 1: Backend
cd backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

Or use the root script:
```bash
npm run dev
```

**Docker Mode:**
```bash
docker-compose up
```

### 5. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Troubleshooting

### TypeScript Path Resolution Issues

If you encounter module resolution errors with `@shared` imports:

1. Build the shared package first:
   ```bash
   cd shared
   npm run build
   ```

2. Ensure `tsconfig.json` path mappings are correct in both frontend and backend

### Database Connection Issues

- Verify PostgreSQL is running: `pg_isready` or check Docker logs
- Check database credentials in `backend/.env`
- Ensure PostGIS extension is installed: `CREATE EXTENSION postgis;`

### Mapbox Issues

- Verify `VITE_MAPBOX_TOKEN` is set in `frontend/.env`
- Check browser console for Mapbox API errors
- Ensure token has proper permissions

### Port Conflicts

If ports 3000 or 5173 are in use:
- Change `PORT` in `backend/.env`
- Change port in `frontend/vite.config.ts`

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [ENV_SETUP.md](ENV_SETUP.md) for environment variable details
- Review the architecture in the README

