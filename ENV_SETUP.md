# Environment Configuration

This document describes the environment variables needed for the GPS Mapping Application.

## Root .env File

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=gps_mapping
DB_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Mapbox Configuration
MAPBOX_ACCESS_TOKEN=your-mapbox-access-token-here

# OpenSky Network API Configuration (for live flight tracking)
OPENSKY_CLIENT_ID=your-opensky-client-id-here
OPENSKY_CLIENT_SECRET=your-opensky-client-secret-here

# WeatherAPI Configuration (for weather data)
WEATHERAPI_KEY=your-weatherapi-key-here

# Frontend Environment Variables
VITE_API_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=your-mapbox-access-token-here
VITE_WEATHERAPI_KEY=your-weatherapi-key-here
```

## Backend .env File

Create a `backend/.env` file with:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=gps_mapping
DB_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Mapbox Configuration
MAPBOX_ACCESS_TOKEN=your-mapbox-access-token-here

# OpenSky Network API Configuration (for live flight tracking)
OPENSKY_CLIENT_ID=your-opensky-client-id-here
OPENSKY_CLIENT_SECRET=your-opensky-client-secret-here

# WeatherAPI Configuration (for weather data)
WEATHERAPI_KEY=your-weatherapi-key-here
```

## Frontend .env File

Create a `frontend/.env` file with:

```env
# API Configuration
VITE_API_URL=http://localhost:3000

# Mapbox Configuration
VITE_MAPBOX_TOKEN=your-mapbox-access-token-here

# WeatherAPI Configuration (for weather data)
VITE_WEATHERAPI_KEY=your-weatherapi-key-here
```

## Getting a Mapbox Access Token

1. Sign up for a free account at [Mapbox](https://account.mapbox.com/)
2. Go to your account page and create an access token
3. Copy the token and use it for both `MAPBOX_ACCESS_TOKEN` and `VITE_MAPBOX_TOKEN`

## Getting OpenSky Network API Credentials

1. Sign up for an account at [OpenSky Network](https://opensky-network.org/)
2. Go to your account settings and create an API client
3. Copy the Client ID and Client Secret
4. Use them for `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET`

Note: OpenSky uses OAuth2 Client Credentials flow for authentication. The backend handles token management automatically.

## Getting a WeatherAPI Key

1. Sign up for a free account at [WeatherAPI](https://www.weatherapi.com/)
2. Go to your dashboard and copy your API key
3. Use the token for `WEATHERAPI_KEY` and `VITE_WEATHERAPI_KEY`

## Security Notes

- **Never commit `.env` files to version control**
- Use strong, unique `JWT_SECRET` values in production
- Keep your Mapbox access token secure
- Keep your OpenSky API credentials secure
- Keep your WeatherAPI key secure
- Rotate secrets regularly in production environments
