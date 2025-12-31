import { apiClient } from './client';
import { GroupTrip, TripWaypoint, TripStatus } from '@shared/types/trips';
import { Coordinates } from '@shared/types/geocoding';

export interface CreateTripDto {
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface AddWaypointDto {
  coordinates: Coordinates;
  name: string;
  notes?: string;
  orderIndex?: number;
}

export const tripsService = {
  async createTrip(data: CreateTripDto): Promise<GroupTrip> {
    const response = await apiClient.instance.post<GroupTrip>('/trips', data);
    return response.data;
  },

  async getMyTrips(): Promise<GroupTrip[]> {
    const response = await apiClient.instance.get<GroupTrip[]>('/trips');
    return response.data;
  },

  async getTrip(tripId: string): Promise<GroupTrip> {
    const response = await apiClient.instance.get<GroupTrip>(`/trips/${tripId}`);
    return response.data;
  },

  async inviteParticipant(tripId: string, userId: string): Promise<any> {
    const response = await apiClient.instance.post(`/trips/${tripId}/participants`, { userId });
    return response.data;
  },

  async addWaypoint(tripId: string, data: AddWaypointDto): Promise<TripWaypoint> {
    const response = await apiClient.instance.post<TripWaypoint>(`/trips/${tripId}/waypoints`, data);
    return response.data;
  },

  async removeWaypoint(tripId: string, waypointId: string): Promise<void> {
    await apiClient.instance.delete(`/trips/${tripId}/waypoints/${waypointId}`);
  },

  async updateTripStatus(tripId: string, status: TripStatus): Promise<GroupTrip> {
    const response = await apiClient.instance.patch<GroupTrip>(`/trips/${tripId}/status`, { status });
    return response.data;
  },
};

