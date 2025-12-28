import { Coordinates } from './geocoding';

export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedLocation {
  id: string;
  userId: string;
  name: string;
  coordinates: Coordinates;
  category?: string;
  createdAt: Date;
}

export interface RouteHistory {
  id: string;
  userId: string;
  waypoints: Coordinates[];
  distance: number;
  duration: number;
  mode: string;
  createdAt: Date;
}

export interface LocationTracking {
  coordinates: Coordinates;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

