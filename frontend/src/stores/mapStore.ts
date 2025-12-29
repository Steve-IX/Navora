import { create } from 'zustand';
import { MapState, MapLayer, Marker, MapRoute } from '@shared/types/map';
import { Coordinates } from '@shared/types/geocoding';

interface MapStore extends MapState {
  setCenter: (center: Coordinates) => void;
  setZoom: (zoom: number) => void;
  setBearing: (bearing: number) => void;
  setPitch: (pitch: number) => void;
  setLayer: (layer: MapLayer) => void;
  setTrafficEnabled: (enabled: boolean) => void;
  markers: Marker[];
  routes: MapRoute[];
  addMarker: (marker: Marker) => void;
  removeMarker: (id: string) => void;
  clearMarkers: () => void;
  addRoute: (route: MapRoute) => void;
  removeRoute: (id: string) => void;
  clearRoutes: () => void;
  updateMapState: (state: Partial<MapState>) => void;
}

// Default to world center (0, 0) instead of hardcoded San Francisco
// Actual location will be detected via geolocation in App.tsx
const defaultCenter: Coordinates = {
  longitude: 0,
  latitude: 0,
};

export const useMapStore = create<MapStore>((set) => ({
  center: defaultCenter,
  zoom: 2, // Lower zoom level for world view when using default center
  bearing: 0,
  pitch: 0,
  layer: 'standard',
  trafficEnabled: false,
  markers: [],
  routes: [],

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setBearing: (bearing) => set({ bearing }),
  setPitch: (pitch) => set({ pitch }),
  setLayer: (layer) => set({ layer }),
  setTrafficEnabled: (enabled) => set({ trafficEnabled: enabled }),

  addMarker: (marker) =>
    set((state) => ({
      markers: [...state.markers, marker],
    })),
  removeMarker: (id) =>
    set((state) => ({
      markers: state.markers.filter((m) => m.id !== id),
    })),
  clearMarkers: () => set({ markers: [] }),

  addRoute: (route) =>
    set((state) => ({
      routes: [...state.routes, route],
    })),
  removeRoute: (id) =>
    set((state) => ({
      routes: state.routes.filter((r) => r.id !== id),
    })),
  clearRoutes: () => set({ routes: [] }),

  updateMapState: (state) => set(state),
}));

