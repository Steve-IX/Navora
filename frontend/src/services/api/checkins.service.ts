import { apiClient } from './client';
import { CheckIn } from '@shared/types/social';
import { Coordinates } from '@shared/types/geocoding';

export interface CreateCheckInDto {
  coordinates: Coordinates;
  placeName: string;
  placeId?: string;
  note?: string;
}

export const checkinsService = {
  async createCheckIn(data: CreateCheckInDto): Promise<CheckIn> {
    const response = await apiClient.instance.post<CheckIn>('/checkins', data);
    return response.data;
  },

  async getMyCheckIns(limit?: number): Promise<CheckIn[]> {
    const response = await apiClient.instance.get<CheckIn[]>('/checkins/me', {
      params: { limit },
    });
    return response.data;
  },

  async getCheckInsNearby(coordinates: Coordinates, radius?: number, limit?: number): Promise<CheckIn[]> {
    const response = await apiClient.instance.get<CheckIn[]>('/checkins/nearby', {
      params: {
        lng: coordinates.longitude,
        lat: coordinates.latitude,
        radius,
        limit,
      },
    });
    return response.data;
  },
};

