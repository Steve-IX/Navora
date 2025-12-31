import { apiClient } from './client';
import { Coordinates } from '@shared/types/geocoding';

export interface LocationShare {
  id: string;
  sharerId: string;
  sharedWithId: string | null;
  coordinates: Coordinates;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface CreateLocationShareDto {
  coordinates: Coordinates;
  sharedWithId?: string;
  isPublic?: boolean;
  expiresInMinutes?: number;
}

export const locationSharesService = {
  async createShare(data: CreateLocationShareDto): Promise<LocationShare> {
    const response = await apiClient.instance.post<LocationShare>('/location-shares', data);
    return response.data;
  },

  async getSharesSharedWithMe(): Promise<LocationShare[]> {
    const response = await apiClient.instance.get<LocationShare[]>('/location-shares/shared-with-me');
    return response.data;
  },

  async getMyActiveShares(): Promise<LocationShare[]> {
    const response = await apiClient.instance.get<LocationShare[]>('/location-shares/my-shares');
    return response.data;
  },

  async stopShare(shareId: string): Promise<void> {
    await apiClient.instance.delete(`/location-shares/${shareId}`);
  },
};

