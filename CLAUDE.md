# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack GPS mapping web application with real-time features, comparable to Google Maps. The project uses a monorepo structure with clear separation between frontend, backend, and shared type definitions.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Zustand + Mapbox GL JS
- Backend: NestJS + TypeScript + PostgreSQL + PostGIS + Socket.io
- Shared: TypeScript types package (`@shared`)

## Common Commands

### Development

```bash
# Install all dependencies (root, frontend, backend, shared)
npm run install:all

# Build the shared types package (required before other packages)
cd shared && npm run build

# Watch shared types for changes (useful during development)
cd shared && npm run watch

# Start development servers (both frontend and backend)
npm run dev

# Start backend with debugger attached
cd backend && npm run start:debug

# Start backend only
cd backend && npm run start:dev

# Start frontend only
cd frontend && npm run dev
```

### Building

```bash
# Build all packages (shared, backend, frontend)
npm run build

# Build individually
cd shared && npm run build
cd backend && npm run build
cd frontend && npm run build

# Preview production frontend build locally
cd frontend && npm run preview
```

### Testing

```bash
# Backend tests
cd backend && npm test

# Run a single test file
cd backend && npm test -- auth.service.spec

# Backend tests with coverage
cd backend && npm run test:cov

# Backend e2e tests
cd backend && npm run test:e2e

# Watch mode
cd backend && npm run test:watch
```

### Linting & Formatting

```bash
# Backend lint (auto-fixes)
cd backend && npm run lint

# Backend format with Prettier
cd backend && npm run format

# Frontend lint
cd frontend && npm run lint
```

### Other Scripts

```bash
# Generate PWA icons (requires sharp)
cd frontend && npm run generate-icons
```

### Database Management

```bash
# Start PostgreSQL with PostGIS via Docker
docker-compose up -d postgres

# Generate TypeORM migration
cd backend && npm run migration:generate -- -n MigrationName

# Run migrations
cd backend && npm run migration:run

# Revert last migration
cd backend && npm run migration:revert
```

## Architecture Overview

### Monorepo Structure

The project is organized as a workspace monorepo:

```
maps/
├── frontend/          # React SPA
├── backend/           # NestJS API server
├── shared/            # Shared TypeScript types (@shared package)
└── package.json       # Root workspace configuration
```

### Shared Types Package

The `shared/` directory contains TypeScript type definitions used by both frontend and backend. This package must be built before working with other packages:

**Key type files:**
- `types/user.ts` - User and authentication types
- `types/map.ts` - Map state, markers, routes
- `types/geocoding.ts` - Coordinates, geocoding results
- `types/routing.ts` - Route requests, waypoints, directions
- `types/places.ts` - Place data, categories, reviews
- `types/social.ts` - Friends, location sharing, check-ins
- `types/trips.ts` - Group trip planning

**Import pattern:**
```typescript
// From frontend or backend
import { Coordinates, User, Place } from '@shared/types';
```

### Backend Architecture (NestJS)

The backend follows NestJS modular architecture with clear separation of concerns:

**Key Modules:**
- `auth/` - JWT + guest authentication (Passport strategies)
- `geocoding/` - Forward/reverse geocoding, autocomplete (Mapbox API)
- `routing/` - Route calculation with profiles: `driving-traffic`, `driving`, `walking`, `cycling`
- `websocket/` - Real-time location updates via Socket.io
- `places/`, `locations/`, `routes/` - Data persistence with PostGIS
- Social features: `friends/`, `location-shares/`, `trips/`, `checkins/`, `reviews/`, `feeds/`
- Infrastructure: `config/` (DB init, PostGIS setup), `common/` (filters, decorators)

**Important Patterns:**
- All entities use TypeORM decorators
- PostGIS POINT geometry for coordinates (stored as `Point` type)
- JWT authentication with `@Public()` decorator for public routes
- Rate limiting via `@nestjs/throttler` with multiple contexts
- Global validation pipes with `class-validator`

**Database:**
- PostgreSQL with PostGIS extension for spatial queries
- TypeORM for ORM (entities auto-discovered in `app.module.ts`)
- Entity synchronization enabled in development, disabled in production
- Database initialization service handles PostGIS extension setup

### Frontend Architecture (React + Zustand)

**State Management:**
The app uses Zustand stores for global state (located in `frontend/src/stores/`):

- `mapStore.ts` - Map center, zoom, bearing, pitch, layers, markers, routes
- `authStore.ts` - User authentication, JWT token, login/logout
- `uiStore.ts` - Side panel state, modal visibility, UI toggles
- `placesStore.ts` - Selected place, nearby places, search results
- `routeStore.ts` - Route planning, waypoints, profile selection
- `locationStore.ts` - GPS tracking, current location
- `locationShareStore.ts` - Friend locations (WebSocket updates)
- `searchStore.ts` - Search input, history, suggestions
- `profileStore.ts` - User profile data
- `friendsStore.ts` - Friends list, friend requests
- `tripsStore.ts` - Group trip planning state

**Component Structure (Atomic Design):**

The frontend uses atomic design principles:
- `components/atoms/` - Smallest UI building blocks
- `components/molecules/` - Combinations of atoms
- `components/ui/` - Reusable UI components (Skeleton, Toast, BottomSheet)

Feature-specific components are organized by domain: `map/`, `search/`, `routing/`, `navigation/`, `places/`, `social/`, `auth/`, etc.

**Styling & Animation:**
- Tailwind CSS for utility-first styling (config in `tailwind.config.js`)
- Framer Motion for animations
- PWA support via `vite-plugin-pwa` and Workbox

**Services:**
Services in `frontend/src/services/` handle API communication:
- `api/` - Axios-based API clients for each backend module
- `locationService.ts` - Geolocation API wrapper
- `websocket.service.ts` - Socket.io client for real-time updates
- `share.service.ts` - URL sharing for locations and routes

**Key Patterns:**
- Zustand stores use `create()` with TypeScript interfaces
- Map components render inside `<MapView>` wrapper
- Side panels controlled via `uiStore` (sidePanelOpen, sidePanelContent)
- Demo mode support (`VITE_DEMO_MODE`) for frontend-only operation
- Placeholder images generated via deterministic hashing

## Important Implementation Details

### PostGIS Geometry Handling

**Backend (TypeORM entities):**
```typescript
@Column({
  type: 'geometry',
  spatialFeatureType: 'Point',
  srid: 4326,
})
coordinates: Point;

// Create geometry from coordinates
import { Point } from 'geojson';
const point: Point = {
  type: 'Point',
  coordinates: [longitude, latitude], // [lng, lat] order!
};
```

**Database queries:**
- Use `ST_Distance` for proximity searches
- Use `ST_DWithin` for radius queries
- Always use SRID 4326 (WGS84)

### Authentication Flow

1. User logs in via `/auth/login` or uses guest mode `/auth/guest`
2. JWT token stored in `authStore` and localStorage
3. Token included in Axios requests via interceptor
4. WebSocket connection established with token for real-time features
5. Protected routes use `JwtAuthGuard` (backend) or `AuthGuard` component (frontend)

### WebSocket Integration

**Backend:** `websocket.gateway.ts` handles Socket.io connections
- Clients authenticate with JWT token on connection
- Location updates broadcast to friends only
- Events: `location-update`, `friend-location-update`

**Frontend:** `websocket.service.ts` manages connection
- Auto-connects when user is authenticated
- Updates `locationShareStore` with friend locations
- Sends current location when tracking enabled

### Route Planning

- Waypoints stored in `routeStore` as `Waypoint[]`
- Route calculation via `/routing/route` endpoint (Mapbox Directions API)
- Results include geometry (LineString), distance, duration, steps

### Environment Variables

**Root `.env`:**
```
MAPBOX_ACCESS_TOKEN=your-token
```

**Backend `.env`:**
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=gps_mapping
JWT_SECRET=your-secret
MAPBOX_ACCESS_TOKEN=your-token
WEATHERAPI_KEY=your-weatherapi-key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
DB_SYNCHRONIZE=true  # Auto-sync entities (dev only!)
RUN_DB_INIT=true     # Enable PostGIS setup
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=your-token
VITE_WEATHERAPI_KEY=your-weatherapi-key
VITE_DEMO_MODE=false
```

## Development Workflow

### Adding a New Feature

1. **Define types** in `shared/src/types/` if new data structures are needed
2. **Build shared package**: `cd shared && npm run build`
3. **Backend changes**:
   - Create entity in module's `entities/` directory
   - Create DTOs in module's `dto/` directory
   - Implement service in module's service file
   - Create controller endpoints
   - Register module in `app.module.ts`
4. **Frontend changes**:
   - Create Zustand store if needed for state management
   - Create API service in `services/api/`
   - Build UI components
   - Integrate with map or side panels

### Working with Database

- Entities are auto-discovered from `**/*.entity.ts` pattern
- TypeORM synchronize is enabled in development (auto-creates tables)
- Use migrations for production changes
- PostGIS extension is auto-enabled by `database-init.service.ts`

### Testing Strategy

- Backend uses Jest with `@nestjs/testing`
- Test files should be named `*.spec.ts`
- E2E tests use `supertest` for API testing
- Frontend testing infrastructure exists but tests are minimal

## Common Pitfalls

1. **Shared package changes:** Always rebuild shared package after type changes
2. **PostGIS coordinate order:** GeoJSON uses `[longitude, latitude]`, not `[lat, lng]`
3. **Environment variables:** Frontend requires `VITE_` prefix for Vite to expose them
4. **CORS issues:** Ensure `FRONTEND_URL` in backend `.env` matches frontend origin
5. **JWT authentication:** Use `@Public()` decorator for endpoints that don't require auth
6. **Rate limiting:** Different throttler contexts for location sharing vs general API
7. **Database sync in production:** Set `DB_SYNCHRONIZE=false` in production environments

## Deployment Notes

**Railway deployment:**
- Uses `railway.json` for configuration
- Requires PostGIS extension setup (see `RAILWAY_POSTGIS_FIX.md`)
- Backend listens on `0.0.0.0:$PORT` (Railway sets PORT automatically)
- CORS configured for multiple origins (comma-separated `FRONTEND_URL`)

**Supabase deployment:**
- See `SUPABASE_SETUP.md` for detailed instructions
- Database includes migrations for all tables and indexes
- PostGIS extension pre-installed in Supabase projects

**Docker deployment:**
- `docker-compose.yml` orchestrates all services
- PostgreSQL with PostGIS image used for database
- Frontend served via nginx in production build
