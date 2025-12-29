import { apiClient } from './client';
import { Place, NearbyPlacesRequest, PlaceSearchRequest, PLACE_CATEGORIES } from '@shared/types/places';

// Check if running in demo mode (frontend-only, no backend)
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' || !import.meta.env.VITE_API_URL;

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const SEARCH_API_URL = 'https://api.mapbox.com/search/searchbox/v1';

// Map our categories to Mapbox Search API categories
const categoryToSearchCategory: Record<string, string> = {
  restaurant: 'restaurant',
  cafe: 'coffee',
  bar: 'bar',
  hotel: 'hotel',
  gas_station: 'gas_station',
  parking: 'parking',
  hospital: 'hospital',
  pharmacy: 'pharmacy',
  bank: 'bank',
  supermarket: 'grocery',
  shopping: 'shopping',
  attraction: 'tourist_attraction',
  museum: 'museum',
  park: 'park',
  gym: 'gym',
  cinema: 'cinema',
  school: 'school',
  airport: 'airport',
  bus_station: 'bus_station',
  train_station: 'train_station',
};

// Reverse mapping
const searchCategoryToOurs: Record<string, string> = {
  restaurant: 'restaurant',
  food: 'restaurant',
  coffee: 'cafe',
  cafe: 'cafe',
  bar: 'bar',
  pub: 'bar',
  hotel: 'hotel',
  lodging: 'hotel',
  gas_station: 'gas_station',
  fuel: 'gas_station',
  parking: 'parking',
  hospital: 'hospital',
  pharmacy: 'pharmacy',
  bank: 'bank',
  grocery: 'supermarket',
  supermarket: 'supermarket',
  shopping: 'shopping',
  store: 'shopping',
  tourist_attraction: 'attraction',
  museum: 'museum',
  park: 'park',
  gym: 'gym',
  fitness: 'gym',
  cinema: 'cinema',
  movie_theater: 'cinema',
  school: 'school',
  education: 'school',
  airport: 'airport',
  bus_station: 'bus_station',
  train_station: 'train_station',
};

function transformSearchFeature(feature: any, categoryHint?: string): Place {
  const properties = feature.properties || {};
  const geometry = feature.geometry || {};
  
  // Get coordinates
  let coords = { longitude: 0, latitude: 0 };
  if (geometry.coordinates) {
    coords = {
      longitude: geometry.coordinates[0],
      latitude: geometry.coordinates[1],
    };
  } else if (feature.center) {
    coords = {
      longitude: feature.center[0],
      latitude: feature.center[1],
    };
  }

  // Determine category
  let category: string | undefined = categoryHint;
  if (!category && properties.poi_category) {
    const cats = properties.poi_category.split(',').map((c: string) => c.trim().toLowerCase());
    for (const cat of cats) {
      if (searchCategoryToOurs[cat]) {
        category = searchCategoryToOurs[cat];
        break;
      }
    }
  }
  if (!category && properties.maki) {
    const makiMap: Record<string, string> = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      bar: 'bar',
      beer: 'bar',
      lodging: 'hotel',
      fuel: 'gas_station',
      parking: 'parking',
      hospital: 'hospital',
      pharmacy: 'pharmacy',
      bank: 'bank',
      grocery: 'supermarket',
      shop: 'shopping',
      attraction: 'attraction',
      museum: 'museum',
      park: 'park',
      fitness: 'gym',
      cinema: 'cinema',
      school: 'school',
      airport: 'airport',
      bus: 'bus_station',
      rail: 'train_station',
    };
    category = makiMap[properties.maki];
  }

  const placeName = properties.name || properties.text || feature.text || 
                    properties.place_name || feature.place_name || 'Unknown Place';
  
  const address = properties.full_address || properties.place_formatted || 
                  properties.address || feature.place_name || '';

  return {
    id: properties.mapbox_id || feature.id || `place-${Date.now()}-${Math.random()}`,
    name: placeName,
    coordinates: coords,
    category,
    categoryIcon: category ? PLACE_CATEGORIES.find(c => c.id === category)?.icon || '📍' : '📍',
    address,
    bbox: feature.bbox,
  };
}

function getCategorySearchTerms(category?: string): string[] {
  if (!category) {
    return ['restaurant', 'cafe', 'bar', 'shop', 'hotel'];
  }

  const terms: Record<string, string[]> = {
    restaurant: ['restaurant', 'dining', 'food'],
    cafe: ['coffee shop', 'cafe', 'coffee'],
    bar: ['bar', 'pub', 'lounge'],
    hotel: ['hotel', 'inn', 'lodging'],
    gas_station: ['gas station', 'fuel', 'petrol'],
    parking: ['parking', 'car park'],
    hospital: ['hospital', 'medical center'],
    pharmacy: ['pharmacy', 'drugstore'],
    bank: ['bank', 'atm'],
    supermarket: ['supermarket', 'grocery'],
    shopping: ['shop', 'store', 'mall'],
    attraction: ['attraction', 'landmark'],
    museum: ['museum', 'gallery'],
    park: ['park', 'garden'],
    gym: ['gym', 'fitness'],
    cinema: ['cinema', 'movie theater'],
    school: ['school', 'university'],
    airport: ['airport'],
    bus_station: ['bus station', 'bus stop'],
    train_station: ['train station', 'railway'],
  };

  return terms[category] || ['point of interest'];
}

export const placesService = {
  async searchPlaces(request: PlaceSearchRequest): Promise<Place[]> {
    if (IS_DEMO_MODE) {
      if (!MAPBOX_TOKEN) {
        throw new Error('Mapbox token not configured');
      }

      try {
        const params = new URLSearchParams({
          q: request.query,
          access_token: MAPBOX_TOKEN,
          limit: (request.limit || 10).toString(),
          language: 'en',
        });

        if (request.coordinates) {
          params.append('proximity', `${request.coordinates.longitude},${request.coordinates.latitude}`);
        }

        if (request.category) {
          const mapboxCategory = categoryToSearchCategory[request.category];
          if (mapboxCategory) {
            params.append('types', 'poi');
            params.append('poi_category', mapboxCategory);
          }
        }

        const url = `${SEARCH_API_URL}/forward?${params.toString()}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error.message || 'Places search failed');
        }

        if (!data.features) return [];
        return data.features.map((f: any) => transformSearchFeature(f, request.category));
      } catch (error) {
        console.error('Places search error:', error);
        throw error;
      }
    }

    const params = new URLSearchParams({ query: request.query });
    if (request.category) params.append('category', request.category);
    if (request.coordinates) {
      params.append('longitude', request.coordinates.longitude.toString());
      params.append('latitude', request.coordinates.latitude.toString());
    }
    if (request.limit) params.append('limit', request.limit.toString());

    const response = await apiClient.instance.get<Place[]>(`/places/search?${params.toString()}`);
    return response.data;
  },

  async getNearbyPlaces(request: NearbyPlacesRequest): Promise<Place[]> {
    if (IS_DEMO_MODE) {
      if (!MAPBOX_TOKEN) {
        throw new Error('Mapbox token not configured');
      }

      try {
        const limit = request.limit || 20;
        
        // Try category endpoint first
        if (request.category) {
          const mapboxCategory = categoryToSearchCategory[request.category];
          if (mapboxCategory) {
            try {
              const params = new URLSearchParams({
                access_token: MAPBOX_TOKEN,
                proximity: `${request.coordinates.longitude},${request.coordinates.latitude}`,
                limit: limit.toString(),
                language: 'en',
              });

              const url = `${SEARCH_API_URL}/category/${mapboxCategory}?${params.toString()}`;
              const response = await fetch(url);
              const data = await response.json();

              if (data.features && data.features.length > 0) {
                return data.features.map((f: any) => transformSearchFeature(f, request.category));
              }
            } catch (categoryError) {
              console.warn('Category search failed, falling back:', categoryError);
            }
          }
        }

        // Fallback to forward search with category terms
        const searchTerms = getCategorySearchTerms(request.category);
        const allResults: Place[] = [];
        const seenIds = new Set<string>();

        for (const term of searchTerms.slice(0, 3)) {
          try {
            const params = new URLSearchParams({
              q: term,
              access_token: MAPBOX_TOKEN,
              proximity: `${request.coordinates.longitude},${request.coordinates.latitude}`,
              limit: '10',
              types: 'poi',
              language: 'en',
            });

            const url = `${SEARCH_API_URL}/forward?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.features) {
              for (const feature of data.features) {
                const id = feature.properties?.mapbox_id || feature.id;
                if (!seenIds.has(id)) {
                  seenIds.add(id);
                  const place = transformSearchFeature(feature, request.category);
                  
                  // Filter by radius
                  if (request.radius) {
                    const distance = calculateDistance(
                      request.coordinates.latitude,
                      request.coordinates.longitude,
                      place.coordinates.latitude,
                      place.coordinates.longitude
                    );
                    if (distance <= request.radius) {
                      allResults.push(place);
                    }
                  } else {
                    allResults.push(place);
                  }
                }
              }
            }
          } catch (termError) {
            console.warn(`Search term "${term}" failed:`, termError);
          }
        }

        return allResults.slice(0, limit);
      } catch (error) {
        console.error('Nearby places error:', error);
        throw error;
      }
    }

    const params = new URLSearchParams({
      longitude: request.coordinates.longitude.toString(),
      latitude: request.coordinates.latitude.toString(),
    });
    if (request.category) params.append('category', request.category);
    if (request.radius) params.append('radius', request.radius.toString());
    if (request.limit) params.append('limit', request.limit.toString());

    const response = await apiClient.instance.get<Place[]>(`/places/nearby?${params.toString()}`);
    return response.data;
  },

  async getPlaceDetails(placeId: string): Promise<Place> {
    if (IS_DEMO_MODE) {
      if (!MAPBOX_TOKEN) {
        throw new Error('Mapbox token not configured');
      }

      try {
        // Try retrieve endpoint
        const url = `${SEARCH_API_URL}/retrieve/${placeId}?access_token=${MAPBOX_TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const place = transformSearchFeature(data.features[0]);
          return enhancePlaceDetails(place);
        }

        throw new Error('Place not found');
      } catch (error) {
        console.error('Place details error:', error);
        throw error;
      }
    }

    const response = await apiClient.instance.get<Place>(`/places/${placeId}`);
    return response.data;
  },

  getCategories() {
    return PLACE_CATEGORIES;
  },
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function enhancePlaceDetails(place: Place): Place {
  const query = place.category || 'place';
  const encodedQuery = encodeURIComponent(query);
  
  // Generate consistent rating/review based on place name
  const hash = place.name.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const normalized = Math.abs(hash % 100) / 100;
  
  return {
    ...place,
    rating: Math.round((3.5 + normalized * 1.5) * 10) / 10,
    reviewCount: 50 + Math.abs(hash % 300),
    priceLevel: place.category === 'restaurant' || place.category === 'hotel' ? 2 + (hash % 2) : 1 + (hash % 2),
    photos: [
      {
        id: 'main',
        url: `https://source.unsplash.com/800x600/?${encodedQuery}`,
        width: 800,
        height: 600,
        attribution: 'Unsplash',
      },
      {
        id: 'thumb1',
        url: `https://source.unsplash.com/400x300/?${encodedQuery},interior`,
        width: 400,
        height: 300,
        attribution: 'Unsplash',
      },
    ],
    description: `${place.name}. A popular ${place.category || 'destination'} worth visiting.`,
    openingHours: {
      openNow: hash % 3 !== 0,
      weekdayText: [
        'Monday: 9:00 AM – 6:00 PM',
        'Tuesday: 9:00 AM – 6:00 PM',
        'Wednesday: 9:00 AM – 6:00 PM',
        'Thursday: 9:00 AM – 6:00 PM',
        'Friday: 9:00 AM – 8:00 PM',
        'Saturday: 10:00 AM – 6:00 PM',
        'Sunday: 10:00 AM – 4:00 PM',
      ],
    },
  };
}
