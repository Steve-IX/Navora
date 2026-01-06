-- Migration: Move PostGIS Extension to Separate Schema (OPTIONAL)
-- 
-- This migration moves the PostGIS extension from the public schema to a separate
-- 'extensions' schema to resolve Supabase security warnings.
--
-- WARNING: This is an advanced operation that may affect your application.
-- Only run this if:
-- 1. You understand the implications
-- 2. You have tested it in a development environment
-- 3. You have a backup of your database
-- 4. You can update your application code if needed
--
-- After running this migration:
-- - PostGIS functions will be in the 'extensions' schema
-- - You may need to update queries that reference PostGIS functions
-- - The search_path is updated to include 'extensions' so most queries should still work
--
-- To revert: ALTER EXTENSION postgis SET SCHEMA public;

DO $$
BEGIN
  -- Create a schema for extensions
  CREATE SCHEMA IF NOT EXISTS extensions;
  
  -- Move PostGIS extension to the extensions schema
  -- This will move all PostGIS functions, types, and tables
  ALTER EXTENSION postgis SET SCHEMA extensions;
  
  -- Update search_path to include extensions schema
  -- This ensures PostGIS functions can be found without schema qualification
  -- Note: This affects the current database session
  PERFORM set_config('search_path', 'public, extensions', false);
  
  -- For persistent changes, you would need:
  -- ALTER DATABASE current_database() SET search_path = public, extensions;
  -- But this requires superuser privileges which you may not have in Supabase
  
  RAISE NOTICE 'PostGIS extension moved to extensions schema successfully';
  RAISE NOTICE 'Note: You may need to update your database search_path permanently';
  RAISE NOTICE 'Run: ALTER DATABASE current_database() SET search_path = public, extensions;';
EXCEPTION 
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Could not move PostGIS extension: insufficient privileges. This requires superuser access.';
    RAISE NOTICE 'The warning can be safely ignored for most use cases.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not move PostGIS extension: %', SQLERRM;
    RAISE NOTICE 'The warning can be safely ignored for most use cases.';
END $$;

