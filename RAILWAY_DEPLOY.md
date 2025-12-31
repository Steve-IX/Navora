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

### Step 2: Set Up Database (Use Supabase - Recommended)

**Important**: Railway's standard PostgreSQL doesn't include PostGIS. We recommend using **Supabase** instead, which includes PostGIS by default.

**Option A: Use Supabase (Recommended - PostGIS Included)**
1. Create a Supabase project at [supabase.com](https://supabase.com/)
2. Enable PostGIS extension (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions)
3. Use Supabase connection details in Step 3

**Option B: Use Railway PostgreSQL (Not Recommended)**
1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Note: PostGIS is not available, geographic features won't work
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

### Step 6: Database Setup (PostGIS and Migrations)

**Important**: The application requires PostGIS for geographic data types. Railway's standard PostgreSQL **does not include PostGIS** by default.

**Option A: Use Railway with PostGIS (Recommended)**

Railway now supports PostGIS-enabled PostgreSQL. When creating your PostgreSQL service:
1. Look for a **PostgreSQL with PostGIS** template/option
2. If not available, you may need to use a custom Docker image or different provider

**Option B: Manual PostGIS Installation (Advanced)**

If you must use Railway's standard PostgreSQL, you would need to manually install PostGIS, which is complex and not recommended.

**Automatic Migration Execution**

The application will automatically:
- Attempt to enable PostGIS extension on startup
- Run database migrations to create required tables
- Enable uuid-ossp extension for UUID generation

To enable automatic database initialization, ensure:
```
RUN_DB_INIT=true
```

This is enabled by default in production mode. Check your backend logs after deployment to verify migrations ran successfully.

**Manual Migration (if needed)**

If automatic migrations fail, you can manually connect to your database and run:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- May fail if PostGIS not installed

-- Then run the migration file: backend/migrations/001_add_social_features_tables.sql
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
| `DB_SYNCHRONIZE` | TypeORM auto-sync (dev only) | `false` (production) |
| `RUN_DB_INIT` | Run DB initialization on startup | `true` (production) |
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

### PostGIS Extension Not Available

**Error**: `extension "postgis" is not available`

**Cause**: Railway's standard PostgreSQL 17 doesn't include PostGIS by default.

**Solutions**:

1. **Switch to a PostGIS-enabled provider**:
   - Use **Supabase** (PostgreSQL with PostGIS included)
   - Use **Neon** with PostGIS extension
   - Use **AWS RDS** with PostGIS
   - Use **DigitalOcean** Managed PostgreSQL with PostGIS

2. **Use Railway with custom PostGIS image** (if supported):
   - Check Railway's documentation for PostGIS templates
   - Or use a custom Docker image for PostgreSQL with PostGIS

3. **Temporary workaround** (not recommended):
   - The application will log a warning but continue
   - Geographic features (location sharing, coordinates) won't work properly
   - You'll need to modify the schema to use regular types instead of GEOGRAPHY

### Database Connection Issues

- Ensure `DB_SSL=true` is set for Railway PostgreSQL
- Check that PostGIS extension is enabled (see above)
- Verify database variables are using Railway references (`${{Postgres.PGHOST}}`, etc.)

### Missing Tables Error

**Error**: `relation "friendships" does not exist` or similar

**Cause**: Database migrations haven't run.

**Solutions**:

1. Ensure `RUN_DB_INIT=true` is set (enabled by default in production)
2. Check backend logs for migration execution
3. Manually run migrations by connecting to the database and executing `backend/migrations/001_add_social_features_tables.sql`
4. If using TypeORM synchronize in development, ensure `DB_SYNCHRONIZE=true` is set

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

