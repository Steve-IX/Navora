# Supabase Setup Guide

This guide will help you migrate from Railway PostgreSQL to Supabase, which includes PostGIS by default.

## Why Supabase?

- ✅ **PostGIS included** - Geographic data types work out of the box
- ✅ **Free tier** - Perfect for development and small projects
- ✅ **Easy setup** - Simple configuration
- ✅ **Managed service** - No need to worry about database maintenance

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com/)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Organization**: Your organization (or create one)
   - **Name**: Your project name (e.g., "gps-mapping")
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for development
5. Click **"Create new project"**
6. Wait for the project to be set up (2-3 minutes)

## Step 2: Get Database Connection Details

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Find the **Connection string** section
3. You'll see a connection string like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Note these values:
   - **Host**: `db.[PROJECT-REF].supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: The password you set

## Step 3: Enable PostGIS Extension

PostGIS is available in Supabase but needs to be enabled:

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **"New query"**
3. Run this SQL:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify PostGIS is enabled
SELECT PostGIS_version();
```

4. You should see the PostGIS version number

## Step 4: Update Railway Environment Variables

Update your Railway backend service environment variables:

### Remove Railway PostgreSQL References

Remove or update these variables:
- `DB_HOST` - Use Supabase host instead of `${{Postgres.PGHOST}}`
- `DB_PORT` - Use `5432` (or Supabase port)
- `DB_USERNAME` - Use `postgres`
- `DB_PASSWORD` - Use your Supabase database password
- `DB_NAME` - Use `postgres`
- `DB_SSL` - Set to `true` (Supabase requires SSL)

### New Environment Variables for Supabase

```env
NODE_ENV=production
PORT=3000
DB_HOST=db.[PROJECT-REF].supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-supabase-password-here
DB_NAME=postgres
DB_SSL=true
RUN_DB_INIT=true
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
MAPBOX_ACCESS_TOKEN=your-mapbox-token
FRONTEND_URL=https://your-frontend.up.railway.app
```

**Important**: Replace `[PROJECT-REF]` with your actual Supabase project reference (found in your connection string).

## Step 5: Deploy and Verify

1. Commit and push your changes (they're already done!)
2. Railway will automatically redeploy
3. Check Railway backend logs for:
   ```
   [DatabaseInitService] PostGIS extension enabled successfully
   [DatabaseInitService] Database initialization completed successfully
   ```
4. Check Supabase dashboard → **Table Editor** to verify tables were created:
   - `users`
   - `user_profiles`
   - `friendships`
   - `group_trips`
   - `trip_participants`
   - `place_reviews`
   - etc.

## Step 6: Test Geographic Features

After deployment, test that PostGIS is working:

1. Try creating a location share
2. Test place reviews with coordinates
3. Verify check-ins work
4. All geographic features should now work properly!

## Connection Pooling (Optional)

For better performance, Supabase recommends using connection pooling:

1. Go to **Settings** → **Database**
2. Use the **Connection pooling** connection string instead
3. Change `DB_PORT` to `6543` (pooled port)
4. Keep `DB_SSL=true`

## Security Notes

- ✅ **Always use SSL** with Supabase (`DB_SSL=true`)
- ✅ **Never commit** your database password to git
- ✅ **Use environment variables** for all sensitive data
- ✅ **Rotate passwords** periodically

## Troubleshooting

### Connection Refused
- Verify `DB_HOST` is correct (includes `db.` prefix)
- Check that `DB_SSL=true`
- Verify your IP is not blocked in Supabase settings

### PostGIS Not Available
- Make sure you ran the SQL commands to enable PostGIS
- Check Supabase project status (should be "Active")

### Tables Not Created
- Check Railway logs for migration errors
- Verify `RUN_DB_INIT=true` is set
- Manually run the migration SQL in Supabase SQL Editor if needed

## Cost Comparison

- **Supabase Free Tier**: 
  - 500 MB database
  - 2 GB bandwidth
  - Perfect for development/small apps
  
- **Supabase Pro**: $25/month
  - 8 GB database
  - 50 GB bandwidth
  - Better for production

## Migration Checklist

- [ ] Created Supabase project
- [ ] Enabled PostGIS extension
- [ ] Updated Railway environment variables
- [ ] Deployed backend
- [ ] Verified tables created
- [ ] Tested geographic features
- [ ] Updated frontend if needed

