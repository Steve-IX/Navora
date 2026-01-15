import { create } from 'zustand';

// Flight data types (matching backend response)
export interface FlightData {
  flightNumber: string;
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  departure: {
    airport: string;
    iata: string;
    icao: string;
    terminal: string | null;
    gate: string | null;
    scheduled: string | null;
    estimated: string | null;
    actual: string | null;
    timezone: string;
  };
  arrival: {
    airport: string;
    iata: string;
    icao: string;
    terminal: string | null;
    gate: string | null;
    scheduled: string | null;
    estimated: string | null;
    actual: string | null;
    timezone: string;
  };
  status: string;
  aircraft: {
    registration: string;
    iata: string;
    icao: string;
  } | null;
  live: {
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    direction: number;
    isGround: boolean;
    updated: string;
  } | null;
}

export interface AirportData {
  name: string;
  iata: string;
  icao: string;
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface FlightState {
  flights: FlightData[];
  selectedFlight: FlightData | null;
  airports: AirportData[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Actions
  setFlights: (flights: FlightData[]) => void;
  selectFlight: (flight: FlightData | null) => void;
  setAirports: (airports: AirportData[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearFlights: () => void;
  clearAirports: () => void;
}

export const useFlightStore = create<FlightState>((set) => ({
  flights: [],
  selectedFlight: null,
  airports: [],
  isLoading: false,
  error: null,
  searchQuery: '',

  setFlights: (flights) => set({ flights, error: null, isLoading: false }),

  selectFlight: (flight) => set({ selectedFlight: flight }),

  setAirports: (airports) => set({ airports, error: null }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearFlights: () => set({ flights: [], selectedFlight: null, error: null }),

  clearAirports: () => set({ airports: [], error: null }),
}));
