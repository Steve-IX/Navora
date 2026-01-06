-- Migration: Fix Supabase Security Warnings
-- This migration addresses RLS and security issues flagged by Supabase linter

-- ============================================================================
-- 1. Enable RLS on spatial_ref_sys (PostGIS system table)
-- ============================================================================
-- This is a read-only PostGIS system table, so we enable RLS with a public read policy
-- Note: This may fail if you don't have ownership of the table (common in managed databases)
-- The error can be safely ignored as spatial_ref_sys is a read-only system table

DO $$
BEGIN
  -- Try to enable RLS on spatial_ref_sys
  -- This may fail if we don't have ownership, which is fine
  BEGIN
    ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
    
    -- Drop policy if it exists, then create a read-only policy for spatial_ref_sys
    -- (PostGIS needs to read this table)
    DROP POLICY IF EXISTS "Allow public read access to spatial_ref_sys" ON public.spatial_ref_sys;
    CREATE POLICY "Allow public read access to spatial_ref_sys"
      ON public.spatial_ref_sys
      FOR SELECT
      USING (true);
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    -- If we don't have permissions, log a notice and continue
    RAISE NOTICE 'Could not enable RLS on spatial_ref_sys: insufficient privileges. This is normal for managed databases and can be safely ignored.';
  END;
END $$;

-- ============================================================================
-- 2. Remove overly permissive service role policies
-- ============================================================================
-- The service role in Supabase bypasses RLS anyway, so these policies are redundant
-- and trigger security warnings. We'll remove them since they're not needed.

-- Note: If you need these policies for specific use cases, you can recreate them
-- with more specific conditions instead of USING (true) and WITH CHECK (true)

-- Remove service role policies from all tables
DROP POLICY IF EXISTS "Service role has full access to check_ins" ON public.check_ins;
DROP POLICY IF EXISTS "Service role has full access to friendships" ON public.friendships;
DROP POLICY IF EXISTS "Service role has full access to group_trips" ON public.group_trips;
DROP POLICY IF EXISTS "Service role has full access to location_list_items" ON public.location_list_items;
DROP POLICY IF EXISTS "Service role has full access to location_shares" ON public.location_shares;
DROP POLICY IF EXISTS "Service role has full access to place_reviews" ON public.place_reviews;
DROP POLICY IF EXISTS "Service role has full access to route_history" ON public.route_history;
DROP POLICY IF EXISTS "Service role has full access to saved_locations" ON public.saved_locations;
DROP POLICY IF EXISTS "Service role has full access to shared_location_lists" ON public.shared_location_lists;
DROP POLICY IF EXISTS "Service role has full access to trip_participants" ON public.trip_participants;
DROP POLICY IF EXISTS "Service role has full access to trip_waypoints" ON public.trip_waypoints;
DROP POLICY IF EXISTS "Service role has full access to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role has full access to users" ON public.users;

-- ============================================================================
-- 3. Move PostGIS Extension to Different Schema (OPTIONAL - Advanced)
-- ============================================================================
-- The PostGIS extension is installed in the public schema, which triggers a warning.
-- Moving it to another schema will fix the warning but requires careful handling.
-- 
-- WARNING: This operation is complex and may break functionality if not done correctly.
-- Only proceed if you understand the implications and have tested in a development environment.
-- 
-- Uncomment the following lines to move PostGIS to a separate schema:
/*
DO $$
BEGIN
  -- Create a schema for extensions
  CREATE SCHEMA IF NOT EXISTS extensions;
  
  -- Move PostGIS extension to the extensions schema
  -- This will move all PostGIS functions, types, and tables
  ALTER EXTENSION postgis SET SCHEMA extensions;
  
  -- Update search_path to include extensions schema
  -- This ensures PostGIS functions can be found without schema qualification
  ALTER DATABASE current_database() SET search_path = public, extensions;
  
  RAISE NOTICE 'PostGIS extension moved to extensions schema successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move PostGIS extension: %. This is normal if you do not have sufficient privileges.', SQLERRM;
END $$;
*/

-- ============================================================================
-- 4. Known Limitations
-- ============================================================================
-- 
-- 1. spatial_ref_sys table RLS:
--    - The spatial_ref_sys table is owned by the PostGIS extension
--    - Regular users cannot enable RLS on this table in managed databases
--    - This is a known limitation and the warning can be safely ignored
--    - The table is read-only and poses minimal security risk
-- 
-- 2. PostGIS Extension Location:
--    - PostGIS is installed in the public schema by default
--    - Moving it requires superuser privileges and may break queries
--    - The warning can be safely ignored for most use cases
--    - If you need to fix it, uncomment section 3 above (with caution)

-- ============================================================================
-- Notes:
-- ============================================================================
-- - The service role in Supabase bypasses RLS by default, so removing these
--   policies won't affect backend functionality
-- - If you need specific service role access patterns, create more restrictive
--   policies instead of USING (true) / WITH CHECK (true)
-- - The spatial_ref_sys table is now protected with RLS but allows public read
--   access, which is appropriate for a PostGIS system table

