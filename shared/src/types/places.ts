import { Coordinates } from './geocoding';

export interface Place {
  id: string;
  name: string;
  coordinates: Coordinates;
  category?: string;
  categoryIcon?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number; // 1-4 scale
  openingHours?: OpeningHours;
  photos?: PlacePhoto[];
  description?: string;
  bbox?: [number, number, number, number];
}

export interface OpeningHours {
  openNow?: boolean;
  weekdayText?: string[];
  periods?: OpeningPeriod[];
}

export interface OpeningPeriod {
  open: { day: number; time: string };
  close: { day: number; time: string };
}

export interface PlacePhoto {
  id: string;
  url: string;
  width?: number;
  height?: number;
  attribution?: string;
}

export interface PlaceCategory {
  id: string;
  name: string;
  icon: string;
  keywords?: string[];
}

export interface NearbyPlacesRequest {
  coordinates: Coordinates;
  category?: string;
  radius?: number; // in meters
  limit?: number;
  proximity?: Coordinates;
}

export interface PlaceSearchRequest {
  query: string;
  category?: string;
  coordinates?: Coordinates;
  bbox?: [number, number, number, number];
  limit?: number;
}

export interface PlaceDetailsRequest {
  placeId: string;
}

export const PLACE_CATEGORIES: PlaceCategory[] = [
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️', keywords: ['restaurant', 'food', 'dining', 'eat'] },
  { id: 'cafe', name: 'Café', icon: '☕', keywords: ['cafe', 'coffee', 'coffeeshop'] },
  { id: 'bar', name: 'Bar', icon: '🍺', keywords: ['bar', 'pub', 'drinks', 'nightlife'] },
  { id: 'hotel', name: 'Hotel', icon: '🏨', keywords: ['hotel', 'lodging', 'accommodation'] },
  { id: 'gas_station', name: 'Gas Station', icon: '⛽', keywords: ['gas', 'fuel', 'station', 'petrol'] },
  { id: 'parking', name: 'Parking', icon: '🅿️', keywords: ['parking', 'parking lot', 'garage'] },
  { id: 'hospital', name: 'Hospital', icon: '🏥', keywords: ['hospital', 'medical', 'health'] },
  { id: 'pharmacy', name: 'Pharmacy', icon: '💊', keywords: ['pharmacy', 'drugstore'] },
  { id: 'bank', name: 'Bank', icon: '🏦', keywords: ['bank', 'atm', 'financial'] },
  { id: 'supermarket', name: 'Supermarket', icon: '🛒', keywords: ['supermarket', 'grocery', 'store'] },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', keywords: ['shopping', 'mall', 'store'] },
  { id: 'attraction', name: 'Attraction', icon: '🎯', keywords: ['attraction', 'tourist', 'landmark'] },
  { id: 'museum', name: 'Museum', icon: '🏛️', keywords: ['museum', 'gallery', 'exhibition'] },
  { id: 'park', name: 'Park', icon: '🌳', keywords: ['park', 'garden', 'recreation'] },
  { id: 'gym', name: 'Gym', icon: '💪', keywords: ['gym', 'fitness', 'exercise'] },
  { id: 'cinema', name: 'Cinema', icon: '🎬', keywords: ['cinema', 'movie', 'theater'] },
  { id: 'school', name: 'School', icon: '🏫', keywords: ['school', 'education', 'university'] },
  { id: 'airport', name: 'Airport', icon: '✈️', keywords: ['airport', 'airfield'] },
  { id: 'bus_station', name: 'Bus Station', icon: '🚌', keywords: ['bus', 'station', 'terminal'] },
  { id: 'train_station', name: 'Train Station', icon: '🚆', keywords: ['train', 'railway', 'station'] },
];

