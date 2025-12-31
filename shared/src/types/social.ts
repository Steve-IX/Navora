import { User } from './user';
import { Coordinates } from './geocoding';

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  statusMessage: string | null;
  locationSharingEnabled: boolean;
  shareWithFriendsOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Friend {
  id: string;
  friendshipId: string;
  friend: {
    id: string;
    email: string;
  };
  createdAt: Date;
}

export interface FriendRequest {
  id: string;
  user: {
    id: string;
    email: string;
  };
  createdAt: Date;
}

export interface CheckIn {
  id: string;
  userId: string;
  coordinates: Coordinates;
  placeName: string;
  placeId?: string;
  note?: string;
  createdAt: Date;
  user?: User;
}

export interface PlaceReview {
  id: string;
  userId: string;
  coordinates: Coordinates;
  placeId?: string;
  placeName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface SharedLocationList {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  items?: LocationListItem[];
}

export interface LocationListItem {
  id: string;
  listId: string;
  coordinates: Coordinates;
  name: string;
  description?: string;
  orderIndex: number;
  createdAt: Date;
}

export interface FeedItem {
  type: 'checkin' | 'review';
  id: string;
  userId: string;
  userName: string;
  timestamp: Date;
  data: any;
}
