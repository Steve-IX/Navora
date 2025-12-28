import { Coordinates } from './geocoding';
import { Route } from './routing';

export type MapLayer = 'standard' | 'satellite' | 'terrain';

export interface MapState {
  center: Coordinates;
  zoom: number;
  bearing: number;
  pitch: number;
  layer: MapLayer;
  trafficEnabled: boolean;
}

export interface Marker {
  id: string;
  coordinates: Coordinates;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface MapRoute extends Route {
  id: string;
  color?: string;
  width?: number;
}

