import { create } from 'zustand';
import { Coordinates } from '@shared/types/geocoding';

interface LocationState {
  currentLocation: Coordinates | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  isTracking: boolean;
  permissionGranted: boolean | null;
  error: string | null;
  setCurrentLocation: (location: Coordinates) => void;
  setAccuracy: (accuracy: number | null) => void;
  setHeading: (heading: number | null) => void;
  setSpeed: (speed: number | null) => void;
  setIsTracking: (isTracking: boolean) => void;
  setPermissionGranted: (granted: boolean | null) => void;
  setError: (error: string | null) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  accuracy: null,
  heading: null,
  speed: null,
  isTracking: false,
  permissionGranted: null,
  error: null,

  setCurrentLocation: (location) => set({ currentLocation: location }),
  setAccuracy: (accuracy) => set({ accuracy }),
  setHeading: (heading) => set({ heading }),
  setSpeed: (speed) => set({ speed }),
  setIsTracking: (isTracking) => set({ isTracking }),
  setPermissionGranted: (granted) => set({ permissionGranted: granted }),
  setError: (error) => set({ error }),
  clearLocation: () =>
    set({
      currentLocation: null,
      accuracy: null,
      heading: null,
      speed: null,
      isTracking: false,
    }),
}));

