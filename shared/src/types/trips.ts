import { Coordinates } from './geocoding';
import { User } from './user';

export enum TripStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export enum ParticipantRole {
  ORGANIZER = 'organizer',
  MEMBER = 'member',
}

export enum ParticipantStatus {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export interface TripWaypoint {
  id: string;
  tripId: string;
  addedById: string;
  coordinates: Coordinates;
  name: string;
  notes: string | null;
  orderIndex: number;
  createdAt: Date;
}

export interface TripParticipant {
  id: string;
  tripId: string;
  userId: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  createdAt: Date;
  user?: User;
}

export interface GroupTrip {
  id: string;
  name: string;
  organizerId: string;
  routeData: any;
  status: TripStatus;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organizer?: User;
  participants?: TripParticipant[];
  waypoints?: TripWaypoint[];
}

