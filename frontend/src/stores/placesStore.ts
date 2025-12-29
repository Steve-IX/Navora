import { create } from 'zustand';
import { Place } from '@shared/types/places';

interface PlacesState {
  searchQuery: string;
  selectedCategory: string | null;
  places: Place[];
  selectedPlace: Place | null;
  nearbyPlaces: Place[];
  isLoading: boolean;
  error: string | null;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setPlaces: (places: Place[]) => void;
  setSelectedPlace: (place: Place | null) => void;
  setNearbyPlaces: (places: Place[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearPlaces: () => void;
}

export const usePlacesStore = create<PlacesState>((set) => ({
  searchQuery: '',
  selectedCategory: null,
  places: [],
  selectedPlace: null,
  nearbyPlaces: [],
  isLoading: false,
  error: null,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setPlaces: (places) => set({ places }),
  setSelectedPlace: (place) => set({ selectedPlace: place }),
  setNearbyPlaces: (places) => set({ nearbyPlaces: places }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearPlaces: () =>
    set({
      places: [],
      selectedPlace: null,
      nearbyPlaces: [],
      searchQuery: '',
      selectedCategory: null,
    }),
}));

