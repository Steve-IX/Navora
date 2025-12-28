import { create } from 'zustand';
import { RoutingProfile, Route, RouteWaypoint } from '@shared/types/routing';

interface RouteState {
  waypoints: RouteWaypoint[];
  selectedProfile: RoutingProfile;
  routes: Route[];
  selectedRoute: Route | null;
  isLoading: boolean;
  error: string | null;
  addWaypoint: (waypoint: RouteWaypoint) => void;
  removeWaypoint: (index: number) => void;
  updateWaypoint: (index: number, waypoint: RouteWaypoint) => void;
  clearWaypoints: () => void;
  setProfile: (profile: RoutingProfile) => void;
  setRoutes: (routes: Route[]) => void;
  setSelectedRoute: (route: Route | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearRoute: () => void;
}

export const useRouteStore = create<RouteState>((set) => ({
  waypoints: [],
  selectedProfile: 'driving',
  routes: [],
  selectedRoute: null,
  isLoading: false,
  error: null,

  addWaypoint: (waypoint) =>
    set((state) => ({
      waypoints: [...state.waypoints, waypoint],
    })),
  removeWaypoint: (index) =>
    set((state) => ({
      waypoints: state.waypoints.filter((_, i) => i !== index),
    })),
  updateWaypoint: (index, waypoint) =>
    set((state) => ({
      waypoints: state.waypoints.map((wp, i) => (i === index ? waypoint : wp)),
    })),
  clearWaypoints: () => set({ waypoints: [] }),

  setProfile: (profile) => set({ selectedProfile: profile }),
  setRoutes: (routes) => set({ routes, selectedRoute: routes[0] || null }),
  setSelectedRoute: (route) => set({ selectedRoute: route }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearRoute: () =>
    set({
      waypoints: [],
      routes: [],
      selectedRoute: null,
      isLoading: false,
      error: null,
    }),
}));

