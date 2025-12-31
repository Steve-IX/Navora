import { create } from 'zustand';
import { Coordinates } from '@shared/types/geocoding';
import { locationSharesService, LocationShare } from '@/services/api/locationShares.service';

export interface FriendLocation {
  userId: string;
  coordinates: Coordinates;
  timestamp: Date;
}

interface LocationShareState {
  sharesSharedWithMe: LocationShare[];
  myActiveShares: LocationShare[];
  friendLocations: Map<string, FriendLocation>;
  isSharing: boolean;
  isLoading: boolean;
  error: string | null;
  setSharesSharedWithMe: (shares: LocationShare[]) => void;
  setMyActiveShares: (shares: LocationShare[]) => void;
  updateFriendLocation: (userId: string, location: FriendLocation) => void;
  removeFriendLocation: (userId: string) => void;
  setIsSharing: (isSharing: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchSharesSharedWithMe: () => Promise<void>;
  fetchMyActiveShares: () => Promise<void>;
  startSharing: (coordinates: Coordinates, options?: { sharedWithId?: string; isPublic?: boolean }) => Promise<void>;
  stopSharing: (shareId: string) => Promise<void>;
}

export const useLocationShareStore = create<LocationShareState>((set) => ({
  sharesSharedWithMe: [],
  myActiveShares: [],
  friendLocations: new Map(),
  isSharing: false,
  isLoading: false,
  error: null,

  setSharesSharedWithMe: (shares) => set({ sharesSharedWithMe: shares }),
  setMyActiveShares: (shares) => set({ myActiveShares: shares }),
  updateFriendLocation: (userId, location) =>
    set((state) => {
      const newMap = new Map(state.friendLocations);
      newMap.set(userId, location);
      return { friendLocations: newMap };
    }),
  removeFriendLocation: (userId) =>
    set((state) => {
      const newMap = new Map(state.friendLocations);
      newMap.delete(userId);
      return { friendLocations: newMap };
    }),
  setIsSharing: (isSharing) => set({ isSharing }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchSharesSharedWithMe: async () => {
    set({ isLoading: true, error: null });
    try {
      const shares = await locationSharesService.getSharesSharedWithMe();
      set({ sharesSharedWithMe: shares, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch shared locations', isLoading: false });
    }
  },

  fetchMyActiveShares: async () => {
    set({ isLoading: true, error: null });
    try {
      const shares = await locationSharesService.getMyActiveShares();
      set({ myActiveShares: shares, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch active shares', isLoading: false });
    }
  },

  startSharing: async (coordinates, options) => {
    set({ isLoading: true, error: null });
    try {
      await locationSharesService.createShare({
        coordinates,
        ...options,
      });
      set({ isSharing: true, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to start sharing', isLoading: false });
      throw error;
    }
  },

  stopSharing: async (shareId) => {
    set({ isLoading: true, error: null });
    try {
      await locationSharesService.stopShare(shareId);
      await locationSharesService.getMyActiveShares();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to stop sharing', isLoading: false });
      throw error;
    }
  },
}));

