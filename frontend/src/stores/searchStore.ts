import { create } from 'zustand';
import { GeocodeResult } from '@shared/types/geocoding';

interface SearchState {
  query: string;
  results: GeocodeResult[];
  selectedResult: GeocodeResult | null;
  recentSearches: GeocodeResult[];
  favorites: GeocodeResult[];
  isLoading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setResults: (results: GeocodeResult[]) => void;
  setSelectedResult: (result: GeocodeResult | null) => void;
  addToRecent: (result: GeocodeResult) => void;
  addToFavorites: (result: GeocodeResult) => void;
  removeFromFavorites: (id: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearSearch: () => void;
}

const MAX_RECENT_SEARCHES = 10;

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  selectedResult: null,
  recentSearches: [],
  favorites: [],
  isLoading: false,
  error: null,

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setSelectedResult: (result) => set({ selectedResult: result }),
  addToRecent: (result) =>
    set((state) => {
      const recent = [result, ...state.recentSearches.filter((r) => r.id !== result.id)].slice(
        0,
        MAX_RECENT_SEARCHES,
      );
      return { recentSearches: recent };
    }),
  addToFavorites: (result) =>
    set((state) => {
      if (state.favorites.some((f) => f.id === result.id)) {
        return state;
      }
      return { favorites: [...state.favorites, result] };
    }),
  removeFromFavorites: (id) =>
    set((state) => ({
      favorites: state.favorites.filter((f) => f.id !== id),
    })),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearSearch: () =>
    set({
      query: '',
      results: [],
      selectedResult: null,
      isLoading: false,
      error: null,
    }),
}));

