import { create } from 'zustand';
import { Friend, FriendRequest } from '@shared/types/social';
import { friendsService } from '@/services/api/friends.service';
import { usersService, SearchUser } from '@/services/api/users.service';

interface FriendsState {
  friends: Friend[];
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  searchResults: SearchUser[];
  isSearching: boolean;
  isLoading: boolean;
  error: string | null;
  setFriends: (friends: Friend[]) => void;
  setReceivedRequests: (requests: FriendRequest[]) => void;
  setSentRequests: (requests: FriendRequest[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
  addFriend: (addresseeId: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
}

export const useFriendsStore = create<FriendsState>((set) => ({
  friends: [],
  receivedRequests: [],
  sentRequests: [],
  searchResults: [],
  isSearching: false,
  isLoading: false,
  error: null,

  setFriends: (friends) => set({ friends }),
  setReceivedRequests: (receivedRequests) => set({ receivedRequests }),
  setSentRequests: (sentRequests) => set({ sentRequests }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  searchUsers: async (query: string) => {
    if (!query || query.trim().length < 2) {
      set({ searchResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const results = await usersService.searchUsers(query);
      set({ searchResults: results, isSearching: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to search users',
        isSearching: false,
        searchResults: [],
      });
    }
  },

  clearSearch: () => set({ searchResults: [], isSearching: false }),

  fetchFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const friends = await friendsService.getFriends();
      set({ friends, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch friends', isLoading: false });
    }
  },

  fetchRequests: async () => {
    try {
      const [received, sent] = await Promise.all([
        friendsService.getFriendRequests('received'),
        friendsService.getFriendRequests('sent'),
      ]);
      set({ receivedRequests: received, sentRequests: sent });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch requests' });
    }
  },

  addFriend: async (addresseeId: string) => {
    set({ isLoading: true, error: null });
    try {
      await friendsService.sendFriendRequest(addresseeId);
      await Promise.all([friendsService.getFriendRequests('sent')]);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to send friend request', isLoading: false });
      throw error;
    }
  },

  acceptRequest: async (requestId: string) => {
    set({ isLoading: true, error: null });
    try {
      await friendsService.acceptFriendRequest(requestId);
      await Promise.all([
        friendsService.getFriends(),
        friendsService.getFriendRequests('received'),
      ]);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to accept request', isLoading: false });
      throw error;
    }
  },

  declineRequest: async (requestId: string) => {
    set({ isLoading: true, error: null });
    try {
      await friendsService.declineFriendRequest(requestId);
      await Promise.all([friendsService.getFriendRequests('received')]);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to decline request', isLoading: false });
      throw error;
    }
  },

  removeFriend: async (friendshipId: string) => {
    set({ isLoading: true, error: null });
    try {
      await friendsService.removeFriend(friendshipId);
      await Promise.all([friendsService.getFriends()]);
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to remove friend', isLoading: false });
      throw error;
    }
  },
}));

