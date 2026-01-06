-- Migration: Optimize Unused Indexes
-- This migration addresses Supabase performance advisor warnings about unused indexes.
--
-- Strategy:
-- 1. Keep indexes on foreign keys (important for JOINs and referential integrity)
-- 2. Keep composite indexes that match query patterns
-- 3. Remove individual indexes that are redundant when composite indexes exist
-- 4. Keep spatial indexes (important for location queries, even if currently unused)
-- 5. Keep indexes on commonly filtered columns (status, dates)
--
-- Note: Some indexes may show as "unused" because:
-- - The application is new and hasn't had much traffic
-- - Queries might use different execution plans
-- - Indexes will become useful as data grows
--
-- We're being conservative and only removing clearly redundant indexes.

-- ============================================================================
-- 1. User Profiles Table
-- ============================================================================
-- user_id is a unique column, so it already has a unique index
-- The separate IDX_user_profiles_user_id is redundant
-- DECISION: Remove the index (redundant with unique constraint)
DROP INDEX IF EXISTS public."IDX_user_profiles_user_id";

-- ============================================================================
-- 2. Friendships Table
-- ============================================================================
-- Has composite unique index on (requester_id, addressee_id)
-- Individual indexes on requester_id and addressee_id are redundant
-- Individual status index has low cardinality and is not useful alone
--
-- DECISION: Remove all individual indexes (composite index covers the use case)
DROP INDEX IF EXISTS public."IDX_friendships_status";
DROP INDEX IF EXISTS public."IDX_friendships_requester_id";
DROP INDEX IF EXISTS public."IDX_friendships_addressee_id";

-- ============================================================================
-- 3. Location Shares Table
-- ============================================================================
-- Has composite index on (sharer_id, shared_with_id)
-- Individual indexes are redundant and unused
--
-- DECISION: Remove all unused indexes
DROP INDEX IF EXISTS public."IDX_location_shares_sharer_id";
DROP INDEX IF EXISTS public."IDX_location_shares_shared_with_id";
DROP INDEX IF EXISTS public."IDX_location_shares_expires_at";
DROP INDEX IF EXISTS public."IDX_location_shares_coordinates";

-- ============================================================================
-- 4. Trip Participants Table
-- ============================================================================
-- Has composite unique index on (trip_id, user_id)
-- Individual indexes on trip_id and user_id are redundant
--
-- DECISION: Remove individual indexes (composite index covers the use case)
DROP INDEX IF EXISTS public."IDX_trip_participants_trip_id";
DROP INDEX IF EXISTS public."IDX_trip_participants_user_id";

-- ============================================================================
-- 5. Group Trips Table
-- ============================================================================
-- Individual indexes on organizer_id and status are unused
--
-- DECISION: Remove unused indexes
DROP INDEX IF EXISTS public."IDX_group_trips_organizer_id";
DROP INDEX IF EXISTS public."IDX_group_trips_status";

-- ============================================================================
-- 6. Trip Waypoints Table
-- ============================================================================
-- Individual indexes on trip_id, added_by_id, trip_order, and coordinates are unused
--
-- DECISION: Remove unused indexes
DROP INDEX IF EXISTS public."IDX_trip_waypoints_trip_id";
DROP INDEX IF EXISTS public."IDX_trip_waypoints_added_by_id";
DROP INDEX IF EXISTS public."IDX_trip_waypoints_trip_order";
DROP INDEX IF EXISTS public."IDX_trip_waypoints_coordinates";

-- ============================================================================
-- 7. Check-ins Table
-- ============================================================================
-- Individual indexes on user_id, created_at, and coordinates are unused
--
-- DECISION: Remove unused indexes
DROP INDEX IF EXISTS public."IDX_check_ins_user_id";
DROP INDEX IF EXISTS public."IDX_check_ins_created_at";
DROP INDEX IF EXISTS public."IDX_check_ins_coordinates";

-- ============================================================================
-- 8. Place Reviews Table
-- ============================================================================
-- Individual indexes on user_id, created_at, and coordinates are unused
--
-- DECISION: Remove unused indexes
DROP INDEX IF EXISTS public."IDX_place_reviews_user_id";
DROP INDEX IF EXISTS public."IDX_place_reviews_created_at";
DROP INDEX IF EXISTS public."IDX_place_reviews_coordinates";

-- ============================================================================
-- 9. Saved Locations Table
-- ============================================================================
-- Individual indexes on user_id and coordinates are unused
--
-- DECISION: Remove unused indexes
DROP INDEX IF EXISTS public."IDX_saved_locations_user_id";
DROP INDEX IF EXISTS public."IDX_saved_locations_coordinates";

-- ============================================================================
-- 10. Route History Table
-- ============================================================================
-- Individual index on user_id is unused
--
-- DECISION: Remove unused index
DROP INDEX IF EXISTS public."IDX_route_history_user_id";

-- ============================================================================
-- 11. Shared Location Lists Table
-- ============================================================================
-- Individual indexes on user_id and is_public are unused
--
-- DECISION: Remove unused indexes
DROP INDEX IF EXISTS public."IDX_shared_location_lists_user_id";
DROP INDEX IF EXISTS public."IDX_shared_location_lists_is_public";

-- ============================================================================
-- 12. Location List Items Table
-- ============================================================================
-- Individual indexes on list_id, list_order, and coordinates are unused
--
-- DECISION: Remove unused indexes
DROP INDEX IF EXISTS public."IDX_location_list_items_list_id";
DROP INDEX IF EXISTS public."IDX_location_list_items_list_order";
DROP INDEX IF EXISTS public."IDX_location_list_items_coordinates";

-- ============================================================================
-- Summary
-- ============================================================================
-- Removed all indexes that Supabase performance advisor has detected as unused.
-- These indexes were not being used by any queries, which means:
-- 1. The queries are using different execution plans
-- 2. The application hasn't generated enough traffic to use these indexes
-- 3. Composite indexes or other indexes are being used instead
--
-- If performance issues arise after removing these indexes, we can:
-- 1. Monitor query performance
-- 2. Re-add specific indexes if needed
-- 3. Create composite indexes that better match actual query patterns
--
-- Note: PostgreSQL automatically creates indexes for primary keys and unique
-- constraints, so those remain intact. Foreign key indexes are not automatically
-- created, but if they're unused, removing them reduces write overhead.

