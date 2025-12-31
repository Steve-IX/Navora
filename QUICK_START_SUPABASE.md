# Quick Start: Supabase + Railway Setup

Follow these steps in order to get your database working with Supabase.

## Step 1: Create Supabase Project (5 minutes)

1. **Go to Supabase**
   - Visit [https://supabase.com](https://supabase.com)
   - Click **"Sign In"** (or create account if needed)
   - Use GitHub to sign in (easiest option)

2. **Create New Project**
   - Click **"New Project"** button (green button)
   - Select your organization (or create one if needed)

3. **Project Setup**
   - **Name**: `gps-mapping` (or any name you want)
   - **Database Password**: 
     - Create a STRONG password (save it in a secure place!)
     - Write it down - you'll need it for Railway
   - **Region**: Choose closest to you (e.g., `US East`, `Europe West`)
   - **Pricing Plan**: Select **Free** (fine for development)

4. **Create Project**
   - Click **"Create new project"** button
   - Wait 2-3 minutes for setup (you'll see a progress screen)

## Step 2: Enable PostGIS Extension (2 minutes)

1. **Open SQL Editor**
   - In your Supabase project dashboard
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"** button

2. **Run SQL Commands**
   - Copy and paste this SQL:
   ```sql
   -- Enable PostGIS for geographic data
   CREATE EXTENSION IF NOT EXISTS postgis;
   
   -- Enable UUID generation
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   
   -- Verify PostGIS is working
   SELECT PostGIS_version();
   ```

3. **Execute**
   - Click **"Run"** button (or press `Ctrl+Enter`)
   - You should see PostGIS version number (like `3.3 USE_GEOS=1`)
   - ✅ Success! PostGIS is now enabled

## Step 3: Get Database Connection Details (2 minutes)

1. **Go to Database Settings**
   - Click **"Settings"** (gear icon) in left sidebar
   - Click **"Database"** submenu

2. **Find Connection Info**
   - Scroll down to **"Connection string"** section
   - You'll see a URI like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
     ```

3. **Extract These Values** (write them down):
   - **Host**: `db.abcdefghijklmnop.supabase.co` (everything after `@` and before `:5432`)
   - **Port**: `5432`
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: The password you created in Step 1

## Step 4: Update Railway Environment Variables (5 minutes)

1. **Open Railway Dashboard**
   - Go to [railway.app](https://railway.app)
   - Click on your project
   - Click on your **backend service**

2. **Go to Variables Tab**
   - Click **"Variables"** tab at the top

3. **Update Database Variables**
   Find these variables and **UPDATE** them with your Supabase details:

   ```env
   DB_HOST=db.abcdefghijklmnop.supabase.co
   ```
   - Replace with your Supabase host from Step 3
   - Remove the `${{Postgres.PGHOST}}` if it exists

   ```env
   DB_PORT=5432
   ```
   - Set to `5432` (or remove if using `${{Postgres.PGPORT}}`)

   ```env
   DB_USERNAME=postgres
   ```
   - Set to `postgres`

   ```env
   DB_PASSWORD=your-supabase-password-here
   ```
   - Replace with the password you created in Step 1

   ```env
   DB_NAME=postgres
   ```
   - Set to `postgres`

   ```env
   DB_SSL=true
   ```
   - Make sure this is set to `true` (Supabase requires SSL)

   ```env
   RUN_DB_INIT=true
   ```
   - Add this if it doesn't exist (enables automatic migrations)

4. **Save Changes**
   - Railway automatically saves when you add/edit variables
   - Wait a few seconds for the service to restart

## Step 5: Verify Deployment (3 minutes)

1. **Check Railway Logs**
   - Still in Railway backend service
   - Click **"Deployments"** tab
   - Click on the latest deployment
   - Click **"View Logs"** button

2. **Look for Success Messages**
   You should see logs like:
   ```
   [DatabaseInitService] Initializing database...
   [DatabaseInitService] Enabling uuid-ossp extension...
   [DatabaseInitService] uuid-ossp extension enabled
   [DatabaseInitService] Attempting to enable PostGIS extension...
   [DatabaseInitService] PostGIS extension enabled successfully ✅
   [DatabaseInitService] Executing X migration statements...
   [DatabaseInitService] Database initialization completed successfully ✅
   ```

3. **Verify Tables in Supabase**
   - Go back to Supabase dashboard
   - Click **"Table Editor"** in left sidebar
   - You should see tables like:
     - ✅ `users`
     - ✅ `user_profiles`
     - ✅ `friendships`
     - ✅ `group_trips`
     - ✅ `trip_participants`
     - ✅ `place_reviews`
     - ✅ `location_shares`
     - ✅ And more...

## Step 6: Test Your Application (2 minutes)

1. **Test API Endpoints**
   - Visit your Railway backend URL: `https://your-backend.up.railway.app`
   - Should see API response or documentation

2. **Test Geographic Features**
   - Try creating a location share
   - Test place reviews
   - Verify coordinates are working

## Troubleshooting

### ❌ "Connection refused" or "Connection timeout"
- **Fix**: Verify `DB_HOST` is correct (include `db.` prefix)
- **Fix**: Make sure `DB_SSL=true`
- **Fix**: Check Supabase project is running (not paused)

### ❌ "PostGIS extension not available"
- **Fix**: Go back to Step 2 and run the SQL commands
- **Fix**: Verify you're using the correct database in Supabase

### ❌ Tables not created
- **Fix**: Check Railway logs for errors
- **Fix**: Manually run migration in Supabase SQL Editor:
  1. Go to SQL Editor in Supabase
  2. Open `backend/migrations/001_add_social_features_tables.sql`
  3. Copy and paste entire file
  4. Click "Run"

### ❌ "Invalid password"
- **Fix**: Double-check `DB_PASSWORD` matches your Supabase password
- **Fix**: Make sure no extra spaces in Railway variables

## Complete Checklist

- [ ] Created Supabase project
- [ ] Enabled PostGIS extension (saw version number)
- [ ] Got connection details from Supabase
- [ ] Updated Railway `DB_HOST` variable
- [ ] Updated Railway `DB_PASSWORD` variable
- [ ] Set Railway `DB_SSL=true`
- [ ] Set Railway `RUN_DB_INIT=true`
- [ ] Verified Railway logs show successful initialization
- [ ] Confirmed tables exist in Supabase Table Editor
- [ ] Tested application features

## Need Help?

- Check `SUPABASE_SETUP.md` for detailed explanations
- Check `RAILWAY_POSTGIS_FIX.md` for common issues
- Railway logs are your best friend - they show exactly what's happening!

---

**You're all set!** 🎉 Your database is now configured with PostGIS and all tables should be created automatically.

