import { create } from 'zustand';
import { WeatherDisplayData } from '@shared/types/weather';

interface WeatherState {
  currentWeather: WeatherDisplayData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  setWeather: (weather: WeatherDisplayData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearWeather: () => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  currentWeather: null,
  isLoading: false,
  error: null,
  lastUpdated: null,

  setWeather: (weather) =>
    set({
      currentWeather: weather,
      error: null,
      isLoading: false,
      lastUpdated: new Date(),
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  clearWeather: () =>
    set({
      currentWeather: null,
      error: null,
      lastUpdated: null,
    }),
}));
