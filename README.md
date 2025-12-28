# GPS Mapping Web Application

A production-ready, full-stack GPS mapping web application with React/TypeScript frontend, NestJS backend, PostgreSQL/PostGIS database, and Mapbox integration. This application provides interactive maps, geocoding, routing, GPS tracking, and comprehensive user features comparable to Google Maps.

## Features

### Core Functionality

- **Interactive Maps**: High-performance map rendering with pan, zoom, tilt, and bearing controls
- **Multiple Map Layers**: Standard, satellite, and terrain views with optional traffic overlay
- **GPS Location Services**: Real-time user geolocation with permission handling and accuracy indicators
- **Search & Geocoding**: Global address and place search with autocomplete, forward and reverse geocoding
- **Routing & Navigation**: Multi-modal route calculation (driving, walking, cycling, transit) with visualization
- **User Features**: Save favorite locations, search history, click-to-drop pins

### Technical Features

- **WebGL-Accelerated Rendering**: High-performance map rendering
- **Real-Time Updates**: WebSocket support for live location tracking
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessibility**: Keyboard navigation and ARIA labels
- **Guest Mode**: Anonymous access with temporary authentication

## Architecture

The application is structured as a monorepo with clear separation between frontend, backend, and shared types:

```
maps/
├── frontend/          # React + TypeScript + Vite
├── backend/           # NestJS + TypeScript
├── shared/            # Shared TypeScript types
└── docker-compose.yml # Docker orchestration
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Zustand for state management
- Mapbox GL JS for map rendering
- Tailwind CSS for styling
- Axios for HTTP requests
- Socket.io-client for WebSocket communication

**Backend:**
- NestJS with TypeScript
- PostgreSQL with PostGIS extension
- TypeORM for database access
- JWT authentication
- WebSocket gateway for real-time updates
- Mapbox APIs for geocoding and routing

**Infrastructure:**
- Docker & Docker Compose
- PostgreSQL with PostGIS
- Nginx (production frontend)

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose (optional, for containerized deployment)
- Mapbox account with access token ([Get one here](https://account.mapbox.com/))

## Setup Instructions

### Option 1: Local Development (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd maps
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**

   Copy the example environment files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   Update the environment variables in each file, especially:
   - `MAPBOX_ACCESS_TOKEN` / `VITE_MAPBOX_TOKEN`: Your Mapbox access token
   - Database credentials (if not using Docker)

4. **Set up PostgreSQL database**

   Using Docker (recommended):
   ```bash
   docker-compose up -d postgres
   ```

   Or install PostgreSQL with PostGIS locally and create a database:
   ```sql
   CREATE DATABASE gps_mapping;
   CREATE EXTENSION postgis;
   ```

5. **Start the development servers**

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

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

### Option 2: Docker Deployment

1. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your MAPBOX_ACCESS_TOKEN
   ```

2. **Start all services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## API Documentation

### Authentication Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with email and password
- `POST /auth/guest` - Create guest token for anonymous access
- `GET /auth/me` - Get current user information

### Geocoding Endpoints

- `GET /geocoding/forward?query=<address>` - Forward geocoding (address → coordinates)
- `GET /geocoding/reverse?lng=<longitude>&lat=<latitude>` - Reverse geocoding (coordinates → address)
- `GET /geocoding/autocomplete?query=<partial>` - Autocomplete suggestions

### Routing Endpoints

- `POST /routing/route` - Calculate route between waypoints
  ```json
  {
    "waypoints": [
      {"coordinates": {"longitude": -122.4194, "latitude": 37.7749}, "name": "Origin"},
      {"coordinates": {"longitude": -122.4094, "latitude": 37.7849}, "name": "Destination"}
    ],
    "profile": "driving",
    "alternatives": true,
    "steps": true
  }
  ```

### Locations Endpoints

- `GET /locations` - Get all saved locations for current user
- `POST /locations` - Save a new location
- `GET /locations/:id` - Get a specific location
- `PATCH /locations/:id` - Update a location
- `DELETE /locations/:id` - Delete a location

### Routes Endpoints

- `GET /routes` - Get route history for current user
- `POST /routes` - Save a route to history
- `GET /routes/:id` - Get a specific route
- `DELETE /routes/:id` - Delete a route

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `password_hash` (String)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### Saved Locations Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `name` (String)
- `coordinates` (PostGIS POINT)
- `category` (String, Nullable)
- `created_at` (Timestamp)

### Route History Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key)
- `waypoints` (PostGIS LineString)
- `distance` (Decimal, meters)
- `duration` (Integer, seconds)
- `mode` (String)
- `created_at` (Timestamp)

## Development

### Project Structure

```
frontend/src/
├── components/        # React components
│   ├── map/          # Map-related components
│   ├── search/       # Search UI components
│   ├── routing/      # Route planning components
│   └── location/     # GPS location components
├── stores/           # Zustand state stores
├── services/         # API services
├── hooks/            # Custom React hooks
└── utils/            # Utility functions

backend/src/
├── auth/             # Authentication module
├── geocoding/        # Geocoding service
├── routing/          # Routing service
├── users/            # User management
├── locations/        # Saved locations
├── routes/           # Route history
├── websocket/        # WebSocket gateway
└── common/           # Shared utilities
```

### Running Tests

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e

# Frontend tests (when implemented)
cd frontend
npm run test
```

### Building for Production

```bash
# Build both frontend and backend
npm run build

# Or individually
cd backend && npm run build
cd frontend && npm run build
```

## Security Considerations

- All API endpoints (except auth/guest) require JWT authentication
- Rate limiting on geocoding and routing endpoints
- Input validation using class-validator
- SQL injection prevention via TypeORM parameterized queries
- Secure API key handling via environment variables
- CORS configuration for cross-origin requests
- Helmet.js for security headers

## Performance Optimizations

- Code splitting with React.lazy()
- Memoization of map components
- Debouncing for search autocomplete
- Caching of geocoding results (when implemented)
- Database query optimization with proper indexes
- WebGL rendering for map performance

## Extensibility

The application is designed to be easily extensible for future features:

- **Offline Maps**: Can be added by integrating service workers and map tile caching
- **AR Navigation**: WebXR APIs can be integrated for augmented reality features
- **Voice Guidance**: Text-to-speech APIs can be integrated for turn-by-turn directions
- **Multi-language Support**: i18n libraries can be added for internationalization
- **Advanced Analytics**: Can integrate analytics services for usage tracking

## Troubleshooting

### Map not rendering
- Ensure `VITE_MAPBOX_TOKEN` is set correctly in frontend `.env`
- Check browser console for Mapbox-related errors

### Database connection errors
- Verify PostgreSQL is running and accessible
- Check database credentials in `backend/.env`
- Ensure PostGIS extension is installed: `CREATE EXTENSION postgis;`

### API requests failing
- Verify backend is running on port 3000
- Check CORS configuration in `backend/src/main.ts`
- Ensure JWT token is included in Authorization header

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Mapbox for providing excellent mapping APIs
- NestJS team for the robust backend framework
- React team for the frontend framework
- All open-source contributors

