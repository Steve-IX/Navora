export interface Coordinates {
  longitude: number;
  latitude: number;
}

export interface GeocodeResult {
  id: string;
  placeName: string;
  coordinates: Coordinates;
  context?: Array<{
    id: string;
    text: string;
    shortCode?: string;
  }>;
  category?: string;
  bbox?: [number, number, number, number];
}

export interface GeocodeRequest {
  query: string;
  proximity?: Coordinates;
  bbox?: [number, number, number, number];
  limit?: number;
}

export interface ReverseGeocodeRequest {
  longitude: number;
  latitude: number;
  limit?: number;
}

