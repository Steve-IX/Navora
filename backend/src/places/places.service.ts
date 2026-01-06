import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PlacesService {
  private readonly mapboxAccessToken: string;
  private readonly searchApiUrl = 'https://api.mapbox.com/search/searchbox/v1';
  private readonly geocodingApiUrl = 'https://api.mapbox.com/geocoding/v5';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.mapboxAccessToken = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!this.mapboxAccessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is required');
    }
  }

  async searchPlaces(query: string, options?: {
    category?: string;
    coordinates?: { longitude: number; latitude: number };
    bbox?: [number, number, number, number];
    limit?: number;
  }) {
    try {
      // Validate and set default limit (Mapbox Search API allows 1-10 for forward search)
      let limit = options?.limit || 10;
      limit = Math.max(1, Math.min(limit, 10));
      
      // Use Mapbox Search API for forward search
      const params = new URLSearchParams({
        q: query,
        access_token: this.mapboxAccessToken,
        limit: limit.toString(),
        language: 'en',
      });

      if (options?.coordinates) {
        params.append('proximity', `${options.coordinates.longitude},${options.coordinates.latitude}`);
      }

      if (options?.category) {
        // Add POI category filter
        const mapboxCategory = this.mapCategoryToSearchCategory(options.category);
        if (mapboxCategory) {
          params.append('types', 'poi');
          params.append('poi_category', mapboxCategory);
        }
      }

      const url = `${this.searchApiUrl}/forward?${params.toString()}`;
      const response = await firstValueFrom(this.httpService.get(url));

      if (!response.data || !response.data.features) {
        console.error('Invalid Mapbox Search response:', response.data);
        return [];
      }

      return response.data.features.map((feature: any) => this.transformSearchResult(feature, options?.category));
    } catch (error: any) {
      console.error('Places search error:', error.response?.data || error.message);
      return [];
    }
  }

  async getPlaceDetails(placeId: string) {
    try {
      // Handle different ID formats
      // Mapbox URIs (base64 encoded) start with "dXJuOm1ieHBvaTo" - these are from the old geocoding API
      // Mapbox Search API uses mapbox_id which is different format
      // The retrieve endpoint only works with mapbox_id from Search API
      
      // If this is a Mapbox URN (old geocoding API format) or a generated ID, we can't retrieve it
      // Return 404 with helpful message
      if (placeId.startsWith('dXJuOm1ieHBvaTo')) {
        throw new HttpException(
          'Place details not available. This place ID uses an older format that cannot be retrieved. Please search for the place again.',
          HttpStatus.NOT_FOUND,
        );
      }
      
      // Generated IDs (starting with 'place-') are for places without mapbox_id and can't be retrieved
      if (placeId.startsWith('place-') && !placeId.includes('mapbox')) {
        throw new HttpException(
          'Place details not available. This place does not have detailed information available.',
          HttpStatus.NOT_FOUND,
        );
      }
      
      let response;
      let feature;
      
      // Try retrieve endpoint first (works with mapbox_id from Search API)
      try {
        const retrieveUrl = `${this.searchApiUrl}/retrieve/${encodeURIComponent(placeId)}?access_token=${this.mapboxAccessToken}`;
        response = await firstValueFrom(this.httpService.get(retrieveUrl));
        
        if (response.data && response.data.features && response.data.features.length > 0) {
          feature = response.data.features[0];
        } else if (response.data && response.data.type === 'Feature') {
          // Single feature response
          feature = response.data;
        }
      } catch (retrieveError: any) {
        // If retrieve fails (404, etc.), try geocoding API as fallback
        try {
          const geocodeUrl = `${this.geocodingApiUrl}/mapbox.places/${encodeURIComponent(placeId)}.json?access_token=${this.mapboxAccessToken}`;
          response = await firstValueFrom(this.httpService.get(geocodeUrl));
          
          if (response.data && response.data.features && response.data.features.length > 0) {
            feature = response.data.features[0];
          }
        } catch (geocodeError: any) {
          // Both endpoints failed - place not found
          console.error('Place details retrieval failed for ID:', placeId, geocodeError.response?.data || geocodeError.message);
          throw new HttpException('Place not found', HttpStatus.NOT_FOUND);
        }
      }
      
      if (!feature) {
        throw new HttpException('Place not found', HttpStatus.NOT_FOUND);
      }

      const place = this.transformSearchResult(feature, null, true);

      // Enhance with additional details
      return {
        ...place,
        rating: this.generateRating(place.name, place.category),
        reviewCount: this.generateReviewCount(place.name, place.category),
        photos: this.generatePlacePhotos(place.name, place.category),
        description: this.generatePlaceDescription(place.name, place.category, place.address),
        priceLevel: this.generatePriceLevel(place.category),
        openingHours: this.generateOpeningHours(place.category),
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Place details error:', error.response?.data || error.message);
      throw new HttpException(
        'Failed to get place details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getNearbyPlaces(coordinates: { longitude: number; latitude: number }, options?: {
    category?: string;
    radius?: number;
    limit?: number;
  }) {
    try {
      // Validate and set default limit
      let limit = options?.limit || 20;
      
      // Validate limit range
      if (options?.category) {
        // Category searches: limit must be between 1 and 10
        limit = Math.max(1, Math.min(limit, 10));
      } else {
        // Non-category searches: limit must be between 1 and 20
        limit = Math.max(1, Math.min(limit, 20));
      }
      
      // Use Mapbox Search API category endpoint for nearby POI searches
      if (options?.category) {
        const mapboxCategory = this.mapCategoryToSearchCategory(options.category);
        if (mapboxCategory) {
          // Category endpoint has a max limit of 10 (already validated above)
          const categoryLimit = limit;
          const params = new URLSearchParams({
            access_token: this.mapboxAccessToken,
            proximity: `${coordinates.longitude},${coordinates.latitude}`,
            limit: categoryLimit.toString(),
            language: 'en',
          });

          const url = `${this.searchApiUrl}/category/${mapboxCategory}?${params.toString()}`;
          
          try {
            const response = await firstValueFrom(this.httpService.get(url));

            if (response.data && response.data.features) {
              const results = response.data.features.map((feature: any) => 
                this.transformSearchResult(feature, options.category)
              );
              // Return up to the requested limit
              return results.slice(0, limit);
            }
          } catch (categoryError) {
            console.warn('Category search failed, falling back to text search:', categoryError);
          }
        }
      }

      // Fallback: use forward search with category-related queries
      const searchTerms = this.getCategorySearchTerms(options?.category);
      const allResults: any[] = [];
      const seenIds = new Set<string>();

      for (const term of searchTerms.slice(0, 3)) { // Limit to 3 terms for performance
        try {
          const params = new URLSearchParams({
            q: term,
            access_token: this.mapboxAccessToken,
            proximity: `${coordinates.longitude},${coordinates.latitude}`,
            limit: '10',
            types: 'poi',
            language: 'en',
          });

          const url = `${this.searchApiUrl}/forward?${params.toString()}`;
          const response = await firstValueFrom(this.httpService.get(url));

          if (response.data && response.data.features) {
            for (const feature of response.data.features) {
              const id = feature.properties?.mapbox_id || feature.id;
              if (!seenIds.has(id)) {
                seenIds.add(id);
                const place = this.transformSearchResult(feature, options?.category);
                
                // Filter by radius if specified
                if (options?.radius) {
                  const distance = this.calculateDistance(
                    coordinates.latitude,
                    coordinates.longitude,
                    place.coordinates.latitude,
                    place.coordinates.longitude
                  );
                  if (distance <= options.radius) {
                    allResults.push({ ...place, distance });
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

      // Sort by distance and limit
      return allResults
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, limit)
        .map(({ distance, ...place }) => place);
    } catch (error: any) {
      console.error('Nearby places error:', error.response?.data || error.message);
      return [];
    }
  }

  private transformSearchResult(feature: any, categoryHint?: string | null, includeDetails = false): any {
    const properties = feature.properties || {};
    const geometry = feature.geometry || {};
    const context = properties.context || {};
    
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
    let category = categoryHint;
    if (!category && properties.poi_category) {
      category = this.mapSearchCategoryToOurs(properties.poi_category);
    }
    if (!category && properties.maki) {
      category = this.mapMakiToCategory(properties.maki);
    }
    if (!category && feature.place_type) {
      category = this.inferCategory(feature.place_type);
    }

    const placeName = properties.name || properties.text || feature.text || 
                      properties.place_name || feature.place_name || 'Unknown Place';
    
    // Build address
    let address = properties.full_address || properties.place_formatted || 
                  properties.address || feature.place_name || '';
    
    if (context.place?.name) {
      address = address || context.place.name;
    }

    // Prefer mapbox_id for retrieval, but keep original ID as fallback
    const mapboxId = properties.mapbox_id;
    const originalId = feature.id || `place-${Date.now()}`;
    
    // Check if originalId is an old-format ID (starts with 'dXJuOm1ieHBvaTo')
    // These IDs cannot be retrieved via the retrieve endpoint
    const isOldFormatId = originalId && originalId.startsWith('dXJuOm1ieHBvaTo');
    
    // If we have mapbox_id, use it. Otherwise, if originalId is old-format, generate a new ID
    // This ensures we never return old-format IDs that can't be retrieved
    let placeId: string;
    if (mapboxId) {
      placeId = mapboxId;
    } else if (isOldFormatId) {
      // Generate a stable ID based on coordinates and name for old-format IDs
      // This allows us to identify the place but won't work with retrieve endpoint
      placeId = `place-${coords.latitude.toFixed(6)}-${coords.longitude.toFixed(6)}-${placeName.replace(/\s+/g, '-').toLowerCase()}`;
    } else {
      placeId = originalId;
    }
    
    const result: any = {
      id: placeId, // Use mapbox_id if available, otherwise use safe ID
      originalId: originalId, // Keep original ID in case we need it
      mapboxId: mapboxId, // Store mapbox_id separately for retrieval
      name: placeName,
      coordinates: coords,
      category,
      categoryIcon: this.getCategoryIcon(category),
      address,
      bbox: feature.bbox,
    };

    if (includeDetails) {
      result.phone = properties.phone || properties.tel;
      result.website = properties.website;
      result.photos = this.generatePlacePhotos(placeName, category);
      result.description = this.generatePlaceDescription(placeName, category, address);
    }

    return result;
  }

  private mapCategoryToSearchCategory(category: string): string | null {
    // Map our categories to Mapbox Search API category IDs
    const categoryMap: Record<string, string> = {
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
    return categoryMap[category] || null;
  }

  private mapSearchCategoryToOurs(searchCategory: string | string[] | any): string | undefined {
    if (!searchCategory) {
      return undefined;
    }

    const reverseMap: Record<string, string> = {
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
    
    // Handle array of categories
    if (Array.isArray(searchCategory)) {
      for (const cat of searchCategory) {
        const normalized = String(cat).trim().toLowerCase();
        if (reverseMap[normalized]) return reverseMap[normalized];
      }
      return undefined;
    }
    
    // Handle string (comma-separated or single)
    const categoryStr = String(searchCategory);
    const categories = categoryStr.split(',').map(c => c.trim().toLowerCase());
    for (const cat of categories) {
      if (reverseMap[cat]) return reverseMap[cat];
    }
    return undefined;
  }

  private mapMakiToCategory(maki: string): string | undefined {
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
    return makiMap[maki];
  }

  private getCategorySearchTerms(category?: string): string[] {
    if (!category) {
      return ['restaurant', 'cafe', 'bar', 'shop', 'hotel'];
    }

    const categoryTerms: Record<string, string[]> = {
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

    return categoryTerms[category] || ['point of interest'];
  }

  private inferCategory(placeTypes: string[]): string | undefined {
    if (!placeTypes || placeTypes.length === 0) return undefined;
    
    const typeMap: Record<string, string> = {
      restaurant: 'restaurant',
      cafe: 'cafe',
      bar: 'bar',
      pub: 'bar',
      hotel: 'hotel',
      gas: 'gas_station',
      parking: 'parking',
      hospital: 'hospital',
      pharmacy: 'pharmacy',
      bank: 'bank',
      market: 'supermarket',
      shop: 'shopping',
      store: 'supermarket',
      poi: 'attraction',
      museum: 'museum',
      park: 'park',
      gym: 'gym',
      cinema: 'cinema',
      school: 'school',
      airport: 'airport',
      bus: 'bus_station',
      railway: 'train_station',
    };

    for (const type of placeTypes) {
      if (typeMap[type]) return typeMap[type];
    }
    return undefined;
  }

  private getCategoryIcon(category?: string): string {
    if (!category) return '📍';
    
    const iconMap: Record<string, string> = {
      restaurant: '🍽️',
      cafe: '☕',
      bar: '🍺',
      hotel: '🏨',
      gas_station: '⛽',
      parking: '🅿️',
      hospital: '🏥',
      pharmacy: '💊',
      bank: '🏦',
      supermarket: '🛒',
      shopping: '🛍️',
      attraction: '🎯',
      museum: '🏛️',
      park: '🌳',
      gym: '💪',
      cinema: '🎬',
      school: '🏫',
      airport: '✈️',
      bus_station: '🚌',
      train_station: '🚆',
    };
    
    return iconMap[category] || '📍';
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  private generateRating(placeName: string, category?: string): number {
    const hash = placeName.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const normalized = Math.abs(hash % 100) / 100;
    return Math.round((3.5 + normalized * 1.5) * 10) / 10;
  }

  private generateReviewCount(placeName: string, category?: string): number {
    const hash = placeName.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const base = category === 'restaurant' || category === 'cafe' ? 100 : 30;
    return base + Math.abs(hash % 300);
  }

  private generatePriceLevel(category?: string): number {
    if (category === 'gas_station' || category === 'parking') return 1;
    if (category === 'restaurant' || category === 'hotel') return 2 + Math.floor(Math.random() * 2);
    return 1 + Math.floor(Math.random() * 2);
  }

  private generateOpeningHours(category?: string): any {
    const hours = {
      openNow: Math.random() > 0.3,
      weekdayText: [
        'Monday: 9:00 AM – 6:00 PM',
        'Tuesday: 9:00 AM – 6:00 PM',
        'Wednesday: 9:00 AM – 6:00 PM',
        'Thursday: 9:00 AM – 6:00 PM',
        'Friday: 9:00 AM – 6:00 PM',
        'Saturday: 10:00 AM – 4:00 PM',
        'Sunday: Closed',
      ],
    };

    if (category === 'restaurant' || category === 'bar') {
      hours.weekdayText = [
        'Monday: 11:00 AM – 11:00 PM',
        'Tuesday: 11:00 AM – 11:00 PM',
        'Wednesday: 11:00 AM – 11:00 PM',
        'Thursday: 11:00 AM – 11:00 PM',
        'Friday: 11:00 AM – 12:00 AM',
        'Saturday: 11:00 AM – 12:00 AM',
        'Sunday: 12:00 PM – 10:00 PM',
      ];
    } else if (category === 'cafe') {
      hours.weekdayText = [
        'Monday: 7:00 AM – 7:00 PM',
        'Tuesday: 7:00 AM – 7:00 PM',
        'Wednesday: 7:00 AM – 7:00 PM',
        'Thursday: 7:00 AM – 7:00 PM',
        'Friday: 7:00 AM – 8:00 PM',
        'Saturday: 8:00 AM – 8:00 PM',
        'Sunday: 8:00 AM – 6:00 PM',
      ];
    }

    return hours;
  }

  private generatePlacePhotos(placeName: string, category?: string): any[] {
    const query = category ? `${category}` : 'place';
    const encodedQuery = encodeURIComponent(query);
    
    return [
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
      {
        id: 'thumb2',
        url: `https://source.unsplash.com/400x300/?${encodedQuery},exterior`,
        width: 400,
        height: 300,
        attribution: 'Unsplash',
      },
    ];
  }

  private generatePlaceDescription(name: string, category?: string, address?: string): string {
    const descriptions: Record<string, string> = {
      restaurant: 'A popular dining destination offering quality cuisine and great service.',
      cafe: 'A cozy café serving excellent coffee and light meals.',
      bar: 'A vibrant spot for drinks and entertainment.',
      hotel: 'Comfortable accommodation with modern amenities.',
      gas_station: 'Convenient fuel station for travelers.',
      parking: 'Safe and convenient parking facility.',
      hospital: 'Healthcare facility providing medical services.',
      pharmacy: 'Pharmacy offering medications and health products.',
      bank: 'Financial services and ATM access.',
      supermarket: 'Wide selection of groceries and household items.',
      shopping: 'Various retail stores and services.',
      attraction: 'Popular point of interest worth visiting.',
      museum: 'Cultural institution with exhibitions.',
      park: 'Green space for recreation and relaxation.',
      gym: 'Fitness center with modern equipment.',
      cinema: 'Movie theater showing the latest films.',
      school: 'Educational institution.',
      airport: 'Airport serving air travel.',
      bus_station: 'Public bus transportation hub.',
      train_station: 'Railway station connecting destinations.',
    };

    const desc = descriptions[category || 'attraction'] || 'A notable location.';
    return `${name}. ${desc}`;
  }
}
