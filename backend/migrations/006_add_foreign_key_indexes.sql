-- Migration: Add Indexes for Foreign Keys
-- This migration adds indexes for foreign key columns that are missing covering indexes.
--
-- NOTE: This migration was created to address Supabase warnings about unindexed
-- foreign keys. However, after adding these indexes, Supabase detected them as
-- unused. The indexes in migration 005_optimize_unused_indexes.sql will remove
-- these if they're not being used.
--
-- Why foreign key indexes are important (when used):
-- 1. Speed up JOINs between tables
-- 2. Speed up DELETE operations on referenced tables (checking for orphaned records)
-- 3. Speed up UPDATE operations on referenced tables
-- 4. Improve overall query performance
--
-- Note: PostgreSQL does NOT automatically create indexes for foreign keys.
-- While foreign key constraints ensure referential integrity, indexes must be
-- created manually for optimal performance. However, if indexes are unused, they
-- add write overhead without providing query benefits.

-- ============================================================================
-- 1. Check-ins Table
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IDX_check_ins_user_id" 
  ON public.check_ins(user_id);

-- ============================================================================
-- 2. Friendships Table
-- ============================================================================
-- Note: requester_id already has a composite index, but addressee_id needs one
CREATE INDEX IF NOT EXISTS "IDX_friendships_addressee_id" 
  ON public.friendships(addressee_id);

-- ============================================================================
-- 3. Group Trips Table
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IDX_group_trips_organizer_id" 
  ON public.group_trips(organizer_id);

-- ============================================================================
-- 4. Location List Items Table
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IDX_location_list_items_list_id" 
  ON public.location_list_items(list_id);

-- ============================================================================
-- 5. Location Shares Table
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IDX_location_shares_sharer_id" 
  ON public.location_shares(sharer_id);

CREATE INDEX IF NOT EXISTS "IDX_location_shares_shared_with_id" 
  ON public.location_shares(shared_with_id);

-- ============================================================================
-- 6. Place Reviews Table
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IDX_place_reviews_user_id" 
  ON public.place_reviews(user_id);

-- ============================================================================
-- 7. Route History Table
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IDX_route_history_user_id" 
  ON public.route_history(user_id);

-- ============================================================================
-- 8. Saved Locations Table
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IDX_saved_locations_user_id" 
  ON public.saved_locations(user_id);

-- ============================================================================
-- 9. Shared Location Lists Table
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IDX_shared_location_lists_user_id" 
  ON public.shared_location_lists(user_id);

-- ============================================================================
-- 10. Trip Participants Table
-- ============================================================================
-- Note: trip_id already has a composite unique index, but user_id needs one
CREATE INDEX IF NOT EXISTS "IDX_trip_participants_user_id" 
  ON public.trip_participants(user_id);

-- ============================================================================
-- 11. Trip Waypoints Table
-- ============================================================================
CREATE INDEX IF NOT EXISTS "IDX_trip_waypoints_trip_id" 
  ON public.trip_waypoints(trip_id);

CREATE INDEX IF NOT EXISTS "IDX_trip_waypoints_added_by_id" 
  ON public.trip_waypoints(added_by_id);

-- ============================================================================
-- Summary
-- ============================================================================
-- Added 13 indexes for foreign key columns across 11 tables.
-- These indexes will improve:
-- - JOIN performance when querying related data
-- - DELETE performance when removing referenced records
-- - UPDATE performance when modifying referenced records
-- - Overall query performance for foreign key lookups

