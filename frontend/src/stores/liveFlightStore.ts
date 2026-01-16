import { create } from 'zustand';
import { LiveFlightDetails, LiveFlightSummary } from '@/types/liveFlights';

export interface LiveFlightFilters {
  airline?: string;
  minAltitude?: number;
  maxAltitude?: number;
  minSpeed?: number;
  maxSpeed?: number;
  destinationCountry?: string;
}

interface LiveFlightState {
  enabled: boolean;
  filters: LiveFlightFilters;
  flights: LiveFlightSummary[];
  selectedFlightId: string | null;
  selectedFlight: LiveFlightDetails | null;
  isLoading: boolean;
  detailsLoading: boolean;
  error: string | null;
  detailsError: string | null;
  lastUpdatedUtc: string | null;
  stale: boolean;

  setEnabled: (enabled: boolean) => void;
  setFilters: (filters: LiveFlightFilters) => void;
  updateFilters: (filters: Partial<LiveFlightFilters>) => void;
  setFlights: (flights: LiveFlightSummary[], updatedAt: string, stale: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectFlightId: (id: string | null) => void;
  setSelectedFlight: (flight: LiveFlightDetails | null) => void;
  setDetailsLoading: (loading: boolean) => void;
  setDetailsError: (error: string | null) => void;
  clearSelection: () => void;
  clearFlights: () => void;
}

export const useLiveFlightStore = create<LiveFlightState>((set) => ({
  enabled: false,
  filters: {},
  flights: [],
  selectedFlightId: null,
  selectedFlight: null,
  isLoading: false,
  detailsLoading: false,
  error: null,
  detailsError: null,
  lastUpdatedUtc: null,
  stale: false,

  setEnabled: (enabled) => set({ enabled }),
  setFilters: (filters) => set({ filters }),
  updateFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setFlights: (flights, updatedAt, stale) =>
    set({ flights, lastUpdatedUtc: updatedAt, stale, isLoading: false, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  selectFlightId: (id) => set({ selectedFlightId: id }),
  setSelectedFlight: (flight) => set({ selectedFlight: flight }),
  setDetailsLoading: (loading) => set({ detailsLoading: loading }),
  setDetailsError: (error) => set({ detailsError: error, detailsLoading: false }),
  clearSelection: () =>
    set({ selectedFlightId: null, selectedFlight: null, detailsError: null, detailsLoading: false }),
  clearFlights: () =>
    set({ flights: [], lastUpdatedUtc: null, stale: false, isLoading: false, error: null }),
}));
