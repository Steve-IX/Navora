import { apiClient } from './client';
import { Friend, FriendRequest } from '@shared/types/social';

export const friendsService = {
  async getFriends(): Promise<Friend[]> {
    const response = await apiClient.instance.get<Friend[]>('/friends');
    return response.data;
  },

  async getFriendRequests(type: 'sent' | 'received' = 'received'): Promise<FriendRequest[]> {
    const response = await apiClient.instance.get<FriendRequest[]>('/friends/requests', {
      params: { type },
    });
    return response.data;
  },

  async sendFriendRequest(addresseeId: string): Promise<any> {
    const response = await apiClient.instance.post('/friends/request', {
      addresseeId,
    });
    return response.data;
  },

  async acceptFriendRequest(requestId: string): Promise<any> {
    const response = await apiClient.instance.post(`/friends/accept/${requestId}`);
    return response.data;
  },

  async declineFriendRequest(requestId: string): Promise<void> {
    await apiClient.instance.post(`/friends/decline/${requestId}`);
  },

  async removeFriend(friendshipId: string): Promise<void> {
    await apiClient.instance.delete(`/friends/${friendshipId}`);
  },
};

