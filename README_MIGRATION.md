# Database Migration for Social Features

The new social collaboration features require additional database tables. Since the production environment on Railway has `synchronize` disabled for safety, you need to run the migration SQL manually.

## Option 1: Run SQL Migration Script (Recommended)

1. Connect to your PostgreSQL database on Railway
2. Run the SQL file: `backend/migrations/001_add_social_features_tables.sql`
3. The script will create all necessary tables with proper indexes and foreign keys

## Option 2: Temporarily Enable Synchronize (One-time only)

If you prefer to use TypeORM's synchronize feature:

1. In Railway, set environment variable: `DB_SYNCHRONIZE=true`
2. Deploy the application (tables will be created automatically)
3. **IMPORTANT**: Remove or set `DB_SYNCHRONIZE=false` after the first successful deployment
4. Never use synchronize in production for ongoing deployments

## Tables Created

- `user_profiles` - User profile information
- `friendships` - Friend relationships
- `location_shares` - Location sharing data
- `group_trips` - Group trip information
- `trip_participants` - Trip participants
- `trip_waypoints` - Trip waypoints
- `check_ins` - Location check-ins
- `place_reviews` - Place reviews and ratings
- `shared_location_lists` - Shared location lists
- `location_list_items` - Items in location lists

## Verification

After running the migration, verify the tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profiles', 
  'friendships', 
  'location_shares',
  'group_trips',
  'trip_participants',
  'trip_waypoints',
  'check_ins',
  'place_reviews',
  'shared_location_lists',
  'location_list_items'
);
```

