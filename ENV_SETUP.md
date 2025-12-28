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

# Frontend Environment Variables
VITE_API_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=your-mapbox-access-token-here
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
```

## Frontend .env File

Create a `frontend/.env` file with:

```env
# API Configuration
VITE_API_URL=http://localhost:3000

# Mapbox Configuration
VITE_MAPBOX_TOKEN=your-mapbox-access-token-here
```

## Getting a Mapbox Access Token

1. Sign up for a free account at [Mapbox](https://account.mapbox.com/)
2. Go to your account page and create an access token
3. Copy the token and use it for both `MAPBOX_ACCESS_TOKEN` and `VITE_MAPBOX_TOKEN`

## Security Notes

- **Never commit `.env` files to version control**
- Use strong, unique `JWT_SECRET` values in production
- Keep your Mapbox access token secure
- Rotate secrets regularly in production environments

