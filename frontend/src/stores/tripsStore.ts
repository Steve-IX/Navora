import { create } from 'zustand';
import { GroupTrip, TripStatus } from '@shared/types/trips';
import { tripsService, CreateTripDto, AddWaypointDto } from '@/services/api/trips.service';

interface TripsState {
  trips: GroupTrip[];
  selectedTrip: GroupTrip | null;
  isLoading: boolean;
  error: string | null;
  setTrips: (trips: GroupTrip[]) => void;
  setSelectedTrip: (trip: GroupTrip | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  fetchTrips: () => Promise<void>;
  fetchTrip: (tripId: string) => Promise<void>;
  createTrip: (data: CreateTripDto) => Promise<void>;
  addWaypoint: (tripId: string, data: AddWaypointDto) => Promise<void>;
  removeWaypoint: (tripId: string, waypointId: string) => Promise<void>;
  updateTripStatus: (tripId: string, status: TripStatus) => Promise<void>;
}

export const useTripsStore = create<TripsState>((set) => ({
  trips: [],
  selectedTrip: null,
  isLoading: false,
  error: null,

  setTrips: (trips) => set({ trips }),
  setSelectedTrip: (selectedTrip) => set({ selectedTrip }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  fetchTrips: async () => {
    set({ isLoading: true, error: null });
    try {
      const trips = await tripsService.getMyTrips();
      set({ trips, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch trips', isLoading: false });
    }
  },

  fetchTrip: async (tripId: string) => {
    set({ isLoading: true, error: null });
    try {
      const trip = await tripsService.getTrip(tripId);
      set({ selectedTrip: trip, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch trip', isLoading: false });
    }
  },

  createTrip: async (data: CreateTripDto) => {
    set({ isLoading: true, error: null });
    try {
      await tripsService.createTrip(data);
      await tripsService.getMyTrips();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to create trip', isLoading: false });
      throw error;
    }
  },

  addWaypoint: async (tripId: string, data: AddWaypointDto) => {
    set({ isLoading: true, error: null });
    try {
      await tripsService.addWaypoint(tripId, data);
      if (tripId) {
        await tripsService.getTrip(tripId);
      }
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to add waypoint', isLoading: false });
      throw error;
    }
  },

  removeWaypoint: async (tripId: string, waypointId: string) => {
    set({ isLoading: true, error: null });
    try {
      await tripsService.removeWaypoint(tripId, waypointId);
      if (tripId) {
        await tripsService.getTrip(tripId);
      }
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to remove waypoint', isLoading: false });
      throw error;
    }
  },

  updateTripStatus: async (tripId: string, status: TripStatus) => {
    set({ isLoading: true, error: null });
    try {
      await tripsService.updateTripStatus(tripId, status);
      await tripsService.getMyTrips();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update trip status', isLoading: false });
      throw error;
    }
  },
}));

