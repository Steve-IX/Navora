# Railway Deployment Guide

Deploy the complete GPS Mapping Application (frontend + backend + database) to Railway.

## Prerequisites

1. [Railway Account](https://railway.app/) (free tier available)
2. GitHub repository with your code

## Deployment Steps

### Step 1: Create a New Project on Railway

1. Go to [railway.app](https://railway.app/) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select your repository

### Step 2: Add PostgreSQL with PostGIS

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Once created, click on the PostgreSQL service
4. Go to **"Variables"** tab and note the connection details

### Step 3: Deploy the Backend

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository
3. Click on the newly created service
4. Go to **"Settings"**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/main.js`

5. Go to **"Variables"** and add:

```
NODE_ENV=production
PORT=3000
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_SSL=true
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoic3RldmUyNjg2IiwiYSI6ImNtam96Z2lsYjE5aDczZXNlYzJkYXNpdWkifQ.zS-oLKJNjhuVQ7xJdKp5ow
FRONTEND_URL=https://your-frontend.up.railway.app
```

6. Go to **"Settings"** → **"Networking"** → **"Generate Domain"**
7. Note your backend URL (e.g., `https://your-backend.up.railway.app`)

### Step 4: Deploy the Frontend

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your repository again
3. Click on the service
4. Go to **"Settings"**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve dist -s -l $PORT`

5. Go to **"Variables"** and add:

```
VITE_API_URL=https://your-backend.up.railway.app
VITE_MAPBOX_TOKEN=pk.eyJ1Ijoic3RldmUyNjg2IiwiYSI6ImNtam96Z2lsYjE5aDczZXNlYzJkYXNpdWkifQ.zS-oLKJNjhuVQ7xJdKp5ow
```

6. Go to **"Settings"** → **"Networking"** → **"Generate Domain"**
7. Note your frontend URL

### Step 5: Update Backend CORS

After getting your frontend URL, update the backend's `FRONTEND_URL` variable:

```
FRONTEND_URL=https://your-frontend.up.railway.app
```

### Step 6: Enable PostGIS Extension

1. Click on your PostgreSQL service
2. Go to **"Data"** tab or connect using the provided credentials
3. Run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Environment Variables Reference

### Backend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (Railway sets this) | `3000` |
| `DB_HOST` | PostgreSQL host | Use `${{Postgres.PGHOST}}` |
| `DB_PORT` | PostgreSQL port | Use `${{Postgres.PGPORT}}` |
| `DB_USERNAME` | PostgreSQL user | Use `${{Postgres.PGUSER}}` |
| `DB_PASSWORD` | PostgreSQL password | Use `${{Postgres.PGPASSWORD}}` |
| `DB_NAME` | PostgreSQL database | Use `${{Postgres.PGDATABASE}}` |
| `DB_SSL` | Enable SSL | `true` |
| `JWT_SECRET` | Secret for JWT tokens | Random secure string |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `MAPBOX_ACCESS_TOKEN` | Mapbox API token | Your token |
| `FRONTEND_URL` | Frontend URL for CORS | Your frontend Railway URL |

### Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | Your backend Railway URL |
| `VITE_MAPBOX_TOKEN` | Mapbox API token | Your token |

## Post-Deployment

### Update Mapbox Token URL Restrictions

1. Go to [Mapbox Access Tokens](https://account.mapbox.com/access-tokens/)
2. Edit your token
3. Add your Railway URLs to allowed URLs:
   - `https://your-frontend.up.railway.app`
   - `https://your-backend.up.railway.app`

### Verify Deployment

1. Visit your frontend URL
2. Check that the map loads
3. Test search functionality
4. Test route planning
5. Test GPS location (requires HTTPS - Railway provides this)

## Troubleshooting

### Database Connection Issues

- Ensure `DB_SSL=true` is set for Railway PostgreSQL
- Check that PostGIS extension is enabled
- Verify database variables are using Railway references (`${{Postgres.PGHOST}}`, etc.)

### CORS Errors

- Verify `FRONTEND_URL` in backend matches your actual frontend URL
- Include the full URL with `https://`

### Build Failures

- Check the build logs in Railway dashboard
- Ensure root directory is set correctly (`backend` or `frontend`)
- Verify all dependencies are in `package.json`

### Map Not Loading

- Verify `VITE_MAPBOX_TOKEN` is set in frontend variables
- Check browser console for errors
- Ensure Mapbox token URL restrictions include your Railway domain

## Cost Estimation

Railway offers:
- **Free Tier**: $5 free credit/month
- **Hobby Plan**: $5/month for more resources

Typical usage for this app:
- PostgreSQL: ~$5-10/month
- Backend: ~$5-10/month  
- Frontend: ~$5/month

Total: ~$15-25/month on the Hobby plan

