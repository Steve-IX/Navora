import { apiClient } from './client';
import { UserProfile } from '@shared/types/social';

export interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string;
  statusMessage?: string;
  locationSharingEnabled?: boolean;
  shareWithFriendsOnly?: boolean;
}

export const profilesService = {
  async getMyProfile(): Promise<UserProfile> {
    const response = await apiClient.instance.get<UserProfile>('/profiles/me');
    return response.data;
  },

  async updateProfile(data: UpdateProfileDto): Promise<UserProfile> {
    const response = await apiClient.instance.patch<UserProfile>('/profiles/me', data);
    return response.data;
  },

  async getProfile(userId: string): Promise<UserProfile> {
    const response = await apiClient.instance.get<UserProfile>(`/profiles/${userId}`);
    return response.data;
  },
};

