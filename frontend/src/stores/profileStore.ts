import { create } from 'zustand';
import { UserProfile } from '@shared/types/social';
import { profilesService, UpdateProfileDto } from '@/services/api/profiles.service';

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  setProfile: (profile: UserProfile | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileDto) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profilesService.getMyProfile();
      set({ profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch profile', isLoading: false });
    }
  },

  updateProfile: async (data: UpdateProfileDto) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await profilesService.updateProfile(data);
      set({ profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update profile', isLoading: false });
      throw error;
    }
  },
}));

