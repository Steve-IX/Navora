-- Migration: Add Social Features Tables
-- This migration creates all the necessary tables for social collaboration features

-- Enable required extensions
-- Note: These may fail if extensions are not available (e.g., PostGIS on Railway's standard PostgreSQL)
-- The application will handle this gracefully

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geographic data types
-- This may fail on PostgreSQL instances without PostGIS installed
CREATE EXTENSION IF NOT EXISTS "postgis";

-- User Profiles
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID UNIQUE NOT NULL,
  "display_name" VARCHAR,
  "avatar_url" VARCHAR,
  "status_message" TEXT,
  "location_sharing_enabled" BOOLEAN NOT NULL DEFAULT false,
  "share_with_friends_only" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_user_profiles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_user_profiles_user_id" ON "user_profiles"("user_id");

-- Friendships
CREATE TABLE IF NOT EXISTS "friendships" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "requester_id" UUID NOT NULL,
  "addressee_id" UUID NOT NULL,
  "status" VARCHAR NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_friendships_requester_id" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_friendships_addressee_id" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_friendships_requester_addressee" UNIQUE ("requester_id", "addressee_id")
);

CREATE INDEX IF NOT EXISTS "IDX_friendships_requester_id" ON "friendships"("requester_id");
CREATE INDEX IF NOT EXISTS "IDX_friendships_addressee_id" ON "friendships"("addressee_id");
CREATE INDEX IF NOT EXISTS "IDX_friendships_status" ON "friendships"("status");

-- Location Shares
CREATE TABLE IF NOT EXISTS "location_shares" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "sharer_id" UUID NOT NULL,
  "shared_with_id" UUID,
  "coordinates" GEOGRAPHY(POINT, 4326) NOT NULL,
  "expires_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_location_shares_sharer_id" FOREIGN KEY ("sharer_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_location_shares_shared_with_id" FOREIGN KEY ("shared_with_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_location_shares_sharer_id" ON "location_shares"("sharer_id");
CREATE INDEX IF NOT EXISTS "IDX_location_shares_shared_with_id" ON "location_shares"("shared_with_id");
CREATE INDEX IF NOT EXISTS "IDX_location_shares_expires_at" ON "location_shares"("expires_at");
CREATE INDEX IF NOT EXISTS "IDX_location_shares_coordinates" ON "location_shares" USING GIST("coordinates");

-- Group Trips
CREATE TABLE IF NOT EXISTS "group_trips" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR NOT NULL,
  "organizer_id" UUID NOT NULL,
  "route_data" JSONB,
  "status" VARCHAR NOT NULL DEFAULT 'planning',
  "start_date" TIMESTAMP,
  "end_date" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_group_trips_organizer_id" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_group_trips_organizer_id" ON "group_trips"("organizer_id");
CREATE INDEX IF NOT EXISTS "IDX_group_trips_status" ON "group_trips"("status");

-- Trip Participants
CREATE TABLE IF NOT EXISTS "trip_participants" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "trip_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" VARCHAR NOT NULL DEFAULT 'member',
  "status" VARCHAR NOT NULL DEFAULT 'invited',
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_trip_participants_trip_id" FOREIGN KEY ("trip_id") REFERENCES "group_trips"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_trip_participants_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "UQ_trip_participants_trip_user" UNIQUE ("trip_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "IDX_trip_participants_trip_id" ON "trip_participants"("trip_id");
CREATE INDEX IF NOT EXISTS "IDX_trip_participants_user_id" ON "trip_participants"("user_id");

-- Trip Waypoints
CREATE TABLE IF NOT EXISTS "trip_waypoints" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "trip_id" UUID NOT NULL,
  "added_by_id" UUID NOT NULL,
  "coordinates" GEOGRAPHY(POINT, 4326) NOT NULL,
  "name" VARCHAR NOT NULL,
  "notes" TEXT,
  "order_index" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_trip_waypoints_trip_id" FOREIGN KEY ("trip_id") REFERENCES "group_trips"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_trip_waypoints_added_by_id" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_trip_waypoints_trip_id" ON "trip_waypoints"("trip_id");
CREATE INDEX IF NOT EXISTS "IDX_trip_waypoints_added_by_id" ON "trip_waypoints"("added_by_id");
CREATE INDEX IF NOT EXISTS "IDX_trip_waypoints_trip_order" ON "trip_waypoints"("trip_id", "order_index");
CREATE INDEX IF NOT EXISTS "IDX_trip_waypoints_coordinates" ON "trip_waypoints" USING GIST("coordinates");

-- Check-ins
CREATE TABLE IF NOT EXISTS "check_ins" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "coordinates" GEOGRAPHY(POINT, 4326) NOT NULL,
  "place_name" VARCHAR NOT NULL,
  "place_id" VARCHAR,
  "note" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_check_ins_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_check_ins_user_id" ON "check_ins"("user_id");
CREATE INDEX IF NOT EXISTS "IDX_check_ins_created_at" ON "check_ins"("created_at");
CREATE INDEX IF NOT EXISTS "IDX_check_ins_coordinates" ON "check_ins" USING GIST("coordinates");

-- Place Reviews
CREATE TABLE IF NOT EXISTS "place_reviews" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "coordinates" GEOGRAPHY(POINT, 4326) NOT NULL,
  "place_id" VARCHAR,
  "place_name" VARCHAR NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_place_reviews_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_place_reviews_user_id" ON "place_reviews"("user_id");
CREATE INDEX IF NOT EXISTS "IDX_place_reviews_place_id" ON "place_reviews"("place_id");
CREATE INDEX IF NOT EXISTS "IDX_place_reviews_created_at" ON "place_reviews"("created_at");
CREATE INDEX IF NOT EXISTS "IDX_place_reviews_coordinates" ON "place_reviews" USING GIST("coordinates");

-- Shared Location Lists
CREATE TABLE IF NOT EXISTS "shared_location_lists" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" UUID NOT NULL,
  "name" VARCHAR NOT NULL,
  "description" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_shared_location_lists_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_shared_location_lists_user_id" ON "shared_location_lists"("user_id");
CREATE INDEX IF NOT EXISTS "IDX_shared_location_lists_is_public" ON "shared_location_lists"("is_public");

-- Location List Items
CREATE TABLE IF NOT EXISTS "location_list_items" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "list_id" UUID NOT NULL,
  "coordinates" GEOGRAPHY(POINT, 4326) NOT NULL,
  "name" VARCHAR NOT NULL,
  "description" TEXT,
  "order_index" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_location_list_items_list_id" FOREIGN KEY ("list_id") REFERENCES "shared_location_lists"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_location_list_items_list_id" ON "location_list_items"("list_id");
CREATE INDEX IF NOT EXISTS "IDX_location_list_items_list_order" ON "location_list_items"("list_id", "order_index");
CREATE INDEX IF NOT EXISTS "IDX_location_list_items_coordinates" ON "location_list_items" USING GIST("coordinates");

