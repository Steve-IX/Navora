-- Migration: Add RLS Policies for All Tables
-- This migration creates Row Level Security policies for all application tables
-- 
-- Note: The backend uses the service role which bypasses RLS, so these policies
-- primarily apply to direct Supabase API access. The backend handles authorization
-- at the application level using JWT tokens.

-- ============================================================================
-- Helper Function: Get Current User ID from JWT
-- ============================================================================
-- This function extracts the user ID from the JWT token in Supabase auth context
-- It's used in RLS policies to identify the authenticated user

-- ============================================================================
-- 1. Users Table Policies
-- ============================================================================
-- Users can only see their own user record
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Users can update their own email (if needed)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id::text);

-- ============================================================================
-- 2. User Profiles Table Policies
-- ============================================================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Users can view profiles of friends (if location sharing is enabled)
-- Note: This requires checking friendships, which is complex in RLS
-- For now, users can only see their own profile
-- Friends can see profiles through the backend API

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- ============================================================================
-- 3. Friendships Table Policies
-- ============================================================================
-- Users can view friendships where they are the requester or addressee
CREATE POLICY "Users can view own friendships"
  ON public.friendships
  FOR SELECT
  USING (
    auth.uid()::text = requester_id::text OR 
    auth.uid()::text = addressee_id::text
  );

-- Users can create friendships where they are the requester
CREATE POLICY "Users can create friendships as requester"
  ON public.friendships
  FOR INSERT
  WITH CHECK (auth.uid()::text = requester_id::text);

-- Users can update friendships where they are the addressee (to accept/decline)
CREATE POLICY "Users can update received friend requests"
  ON public.friendships
  FOR UPDATE
  USING (auth.uid()::text = addressee_id::text);

-- Users can delete friendships where they are involved
CREATE POLICY "Users can delete own friendships"
  ON public.friendships
  FOR DELETE
  USING (
    auth.uid()::text = requester_id::text OR 
    auth.uid()::text = addressee_id::text
  );

-- ============================================================================
-- 4. Location Shares Table Policies
-- ============================================================================
-- Users can view location shares shared with them or shared by them
CREATE POLICY "Users can view relevant location shares"
  ON public.location_shares
  FOR SELECT
  USING (
    auth.uid()::text = sharer_id::text OR 
    auth.uid()::text = shared_with_id::text OR
    shared_with_id IS NULL  -- Public shares
  );

-- Users can create location shares
CREATE POLICY "Users can create location shares"
  ON public.location_shares
  FOR INSERT
  WITH CHECK (auth.uid()::text = sharer_id::text);

-- Users can delete their own location shares
CREATE POLICY "Users can delete own location shares"
  ON public.location_shares
  FOR DELETE
  USING (auth.uid()::text = sharer_id::text);

-- ============================================================================
-- 5. Check-ins Table Policies
-- ============================================================================
-- Users can view their own check-ins
CREATE POLICY "Users can view own check-ins"
  ON public.check_ins
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Users can create their own check-ins
CREATE POLICY "Users can create own check-ins"
  ON public.check_ins
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Users can delete their own check-ins
CREATE POLICY "Users can delete own check-ins"
  ON public.check_ins
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- 6. Place Reviews Table Policies
-- ============================================================================
-- Users can view all reviews (public)
CREATE POLICY "Users can view all reviews"
  ON public.place_reviews
  FOR SELECT
  USING (true);

-- Users can create their own reviews
CREATE POLICY "Users can create own reviews"
  ON public.place_reviews
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.place_reviews
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON public.place_reviews
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- 7. Saved Locations Table Policies
-- ============================================================================
-- Users can view their own saved locations
CREATE POLICY "Users can view own saved locations"
  ON public.saved_locations
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Users can create their own saved locations
CREATE POLICY "Users can create own saved locations"
  ON public.saved_locations
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own saved locations
CREATE POLICY "Users can update own saved locations"
  ON public.saved_locations
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Users can delete their own saved locations
CREATE POLICY "Users can delete own saved locations"
  ON public.saved_locations
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- 8. Route History Table Policies
-- ============================================================================
-- Users can view their own route history
CREATE POLICY "Users can view own route history"
  ON public.route_history
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- Users can create their own route history
CREATE POLICY "Users can create own route history"
  ON public.route_history
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Users can delete their own route history
CREATE POLICY "Users can delete own route history"
  ON public.route_history
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- 9. Shared Location Lists Table Policies
-- ============================================================================
-- Users can view public lists or lists they own
CREATE POLICY "Users can view location lists"
  ON public.shared_location_lists
  FOR SELECT
  USING (
    is_public = true OR 
    auth.uid()::text = user_id::text
  );

-- Users can create location lists
CREATE POLICY "Users can create location lists"
  ON public.shared_location_lists
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own location lists
CREATE POLICY "Users can update own location lists"
  ON public.shared_location_lists
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Users can delete their own location lists
CREATE POLICY "Users can delete own location lists"
  ON public.shared_location_lists
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- 10. Location List Items Table Policies
-- ============================================================================
-- Users can view items from lists they can access
CREATE POLICY "Users can view location list items"
  ON public.location_list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_location_lists
      WHERE shared_location_lists.id = location_list_items.list_id
      AND (shared_location_lists.is_public = true OR shared_location_lists.user_id::text = auth.uid()::text)
    )
  );

-- Users can create items in lists they own
CREATE POLICY "Users can create location list items"
  ON public.location_list_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_location_lists
      WHERE shared_location_lists.id = location_list_items.list_id
      AND shared_location_lists.user_id::text = auth.uid()::text
    )
  );

-- Users can update items in lists they own
CREATE POLICY "Users can update location list items"
  ON public.location_list_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_location_lists
      WHERE shared_location_lists.id = location_list_items.list_id
      AND shared_location_lists.user_id::text = auth.uid()::text
    )
  );

-- Users can delete items in lists they own
CREATE POLICY "Users can delete location list items"
  ON public.location_list_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_location_lists
      WHERE shared_location_lists.id = location_list_items.list_id
      AND shared_location_lists.user_id::text = auth.uid()::text
    )
  );

-- ============================================================================
-- 11. Group Trips Table Policies
-- ============================================================================
-- Users can view trips they are participants in
CREATE POLICY "Users can view trips they participate in"
  ON public.group_trips
  FOR SELECT
  USING (
    organizer_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = group_trips.id
      AND trip_participants.user_id::text = auth.uid()::text
    )
  );

-- Users can create trips (as organizer)
CREATE POLICY "Users can create trips"
  ON public.group_trips
  FOR INSERT
  WITH CHECK (auth.uid()::text = organizer_id::text);

-- Organizers can update trips
CREATE POLICY "Organizers can update trips"
  ON public.group_trips
  FOR UPDATE
  USING (auth.uid()::text = organizer_id::text);

-- Organizers can delete trips
CREATE POLICY "Organizers can delete trips"
  ON public.group_trips
  FOR DELETE
  USING (auth.uid()::text = organizer_id::text);

-- ============================================================================
-- 12. Trip Participants Table Policies
-- ============================================================================
-- Users can view participants of trips they are in
CREATE POLICY "Users can view trip participants"
  ON public.trip_participants
  FOR SELECT
  USING (
    user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.group_trips
      WHERE group_trips.id = trip_participants.trip_id
      AND (
        group_trips.organizer_id::text = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM public.trip_participants tp2
          WHERE tp2.trip_id = trip_participants.trip_id
          AND tp2.user_id::text = auth.uid()::text
        )
      )
    )
  );

-- Organizers can add participants
CREATE POLICY "Organizers can add trip participants"
  ON public.trip_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_trips
      WHERE group_trips.id = trip_participants.trip_id
      AND group_trips.organizer_id::text = auth.uid()::text
    )
  );

-- Users can update their own participant status (to accept/decline)
CREATE POLICY "Users can update own participant status"
  ON public.trip_participants
  FOR UPDATE
  USING (user_id::text = auth.uid()::text);

-- Organizers and participants can remove participants
CREATE POLICY "Users can remove trip participants"
  ON public.trip_participants
  FOR DELETE
  USING (
    user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.group_trips
      WHERE group_trips.id = trip_participants.trip_id
      AND group_trips.organizer_id::text = auth.uid()::text
    )
  );

-- ============================================================================
-- 13. Trip Waypoints Table Policies
-- ============================================================================
-- Users can view waypoints of trips they participate in
CREATE POLICY "Users can view trip waypoints"
  ON public.trip_waypoints
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_trips
      WHERE group_trips.id = trip_waypoints.trip_id
      AND (
        group_trips.organizer_id::text = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM public.trip_participants
          WHERE trip_participants.trip_id = trip_waypoints.trip_id
          AND trip_participants.user_id::text = auth.uid()::text
          AND trip_participants.status = 'accepted'
        )
      )
    )
  );

-- Participants can add waypoints
CREATE POLICY "Participants can add trip waypoints"
  ON public.trip_waypoints
  FOR INSERT
  WITH CHECK (
    added_by_id::text = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = trip_waypoints.trip_id
      AND trip_participants.user_id::text = auth.uid()::text
      AND trip_participants.status = 'accepted'
    )
  );

-- Users can update waypoints they added or organizers can update any
CREATE POLICY "Users can update trip waypoints"
  ON public.trip_waypoints
  FOR UPDATE
  USING (
    added_by_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.group_trips
      WHERE group_trips.id = trip_waypoints.trip_id
      AND group_trips.organizer_id::text = auth.uid()::text
    )
  );

-- Users can delete waypoints they added or organizers can delete any
CREATE POLICY "Users can delete trip waypoints"
  ON public.trip_waypoints
  FOR DELETE
  USING (
    added_by_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.group_trips
      WHERE group_trips.id = trip_waypoints.trip_id
      AND group_trips.organizer_id::text = auth.uid()::text
    )
  );

-- ============================================================================
-- Notes:
-- ============================================================================
-- - These policies use auth.uid() which is provided by Supabase's auth system
-- - The backend uses the service role which bypasses RLS, so these policies
--   primarily apply to direct Supabase API/PostgREST access
-- - All policies are designed to allow users to access only their own data
--   or data they have permission to access (e.g., friends, trip participants)
-- - Public data (like place reviews and public location lists) is accessible to all

