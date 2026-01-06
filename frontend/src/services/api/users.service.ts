import { apiClient } from './client';

export interface SearchUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export const usersService = {
  async searchUsers(query: string): Promise<SearchUser[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const response = await apiClient.instance.get<SearchUser[]>('/users/search', {
      params: { q: query.trim() },
    });
    return response.data;
  },
};

