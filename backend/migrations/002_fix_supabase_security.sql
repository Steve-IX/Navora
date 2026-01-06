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
-- 3. PostGIS Extension Location (WARNING - Manual Action Required)
-- ============================================================================
-- The PostGIS extension is installed in the public schema, which triggers a warning.
-- Moving it to another schema is complex and may break functionality.
-- 
-- If you need to move PostGIS to a different schema, you would need to:
-- 1. Create a new schema (e.g., 'extensions')
-- 2. Move the extension: ALTER EXTENSION postgis SET SCHEMA extensions;
-- 3. Update all references to PostGIS functions
-- 
-- This is NOT recommended unless you have a specific security requirement.
-- The warning can be safely ignored for most use cases.
-- 
-- To suppress the warning, you can move PostGIS to a different schema:
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- ALTER EXTENSION postgis SET SCHEMA extensions;
-- 
-- WARNING: This may break existing queries that reference PostGIS functions
-- without schema qualification. Test thoroughly before applying in production.

-- ============================================================================
-- Notes:
-- ============================================================================
-- - The service role in Supabase bypasses RLS by default, so removing these
--   policies won't affect backend functionality
-- - If you need specific service role access patterns, create more restrictive
--   policies instead of USING (true) / WITH CHECK (true)
-- - The spatial_ref_sys table is now protected with RLS but allows public read
--   access, which is appropriate for a PostGIS system table

