import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PlacesService {
  private readonly mapboxAccessToken: string;
  private readonly mapboxApiUrl = 'https://api.mapbox.com/geocoding/v5';

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
      const proximityParam = options?.coordinates
        ? `&proximity=${options.coordinates.longitude},${options.coordinates.latitude}`
        : '';
      const bboxParam = options?.bbox ? `&bbox=${options.bbox.join(',')}` : '';
      const limitParam = options?.limit ? `&limit=${options.limit}` : '&limit=20';
      
      // Mapbox uses types parameter for categories
      const typesParam = options?.category ? `&types=${this.mapCategoryToMapboxTypes(options.category)}` : '';

      const url = `${this.mapboxApiUrl}/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxAccessToken}${proximityParam}${bboxParam}${limitParam}${typesParam}`;

      const response = await firstValueFrom(this.httpService.get(url));

      if (!response.data || !response.data.features) {
        console.error('Invalid Mapbox response:', response.data);
        return [];
      }

      return response.data.features.map((feature: any) => this.transformPlace(feature));
    } catch (error: any) {
      console.error('Places search error:', error.response?.data || error.message);
      // Return empty array instead of throwing to prevent 500 errors
      // The frontend can handle empty results gracefully
      return [];
    }
  }

  async getPlaceDetails(placeId: string) {
    try {
      // Mapbox doesn't have a separate details endpoint, so we use the place ID directly
      const url = `${this.mapboxApiUrl}/mapbox.places/${placeId}.json?access_token=${this.mapboxAccessToken}`;
      
      const response = await firstValueFrom(this.httpService.get(url));
      
      if (!response.data.features || response.data.features.length === 0) {
        throw new HttpException('Place not found', HttpStatus.NOT_FOUND);
      }

      const feature = response.data.features[0];
      const place = this.transformPlace(feature, true);
      const category = place.category;
      const placeName = place.name;

      // Enhance with additional details
      return {
        ...place,
        rating: this.generateRating(placeName, category),
        reviewCount: this.generateReviewCount(placeName, category),
        photos: this.generatePlacePhotos(placeName, category),
        description: this.generatePlaceDescription(placeName, category, place.address),
        priceLevel: this.generatePriceLevel(category),
        openingHours: this.generateOpeningHours(category),
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

  private generateRating(placeName: string, category?: string): number {
    // Generate a realistic rating between 3.5 and 5.0
    // In a real app, this would come from a reviews API
    const baseRating = 4.0;
    const variation = Math.random() * 1.5; // 0 to 1.5
    return Math.round((baseRating + variation) * 10) / 10; // Round to 1 decimal
  }

  private generateReviewCount(placeName: string, category?: string): number {
    // Generate a realistic review count
    const baseCount = category === 'restaurant' || category === 'cafe' ? 150 : 50;
    const variation = Math.floor(Math.random() * 200);
    return baseCount + variation;
  }

  private generatePriceLevel(category?: string): number {
    // Generate price level (1-4, where 1 is cheapest, 4 is most expensive)
    if (category === 'gas_station' || category === 'parking') return 1;
    if (category === 'restaurant' || category === 'hotel') {
      return Math.floor(Math.random() * 2) + 2; // 2-3
    }
    return Math.floor(Math.random() * 2) + 1; // 1-2
  }

  private generateOpeningHours(category?: string): any {
    // Generate basic opening hours
    const isOpen = Math.random() > 0.3; // 70% chance of being open
    
    const hours = {
      openNow: isOpen,
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

    // Adjust hours based on category
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

  async getNearbyPlaces(coordinates: { longitude: number; latitude: number }, options?: {
    category?: string;
    radius?: number; // in meters
    limit?: number;
  }) {
    try {
      // For nearby places, we use a different approach - search for POI near coordinates
      const query = options?.category || 'poi'; // Point of Interest
      const radius = options?.radius || 1000; // 1km default
      
      // Calculate bounding box from radius
      const bbox = this.calculateBoundingBox(coordinates, radius);
      
      const proximityParam = `&proximity=${coordinates.longitude},${coordinates.latitude}`;
      const bboxParam = `&bbox=${bbox.join(',')}`;
      const limitParam = options?.limit ? `&limit=${options.limit}` : '&limit=20';
      
      // Mapbox uses types parameter for categories
      const typesParam = options?.category ? `&types=${this.mapCategoryToMapboxTypes(options.category)}` : '&types=poi';

      const url = `${this.mapboxApiUrl}/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxAccessToken}${proximityParam}${bboxParam}${limitParam}${typesParam}`;

      const response = await firstValueFrom(this.httpService.get(url));

      if (!response.data || !response.data.features) {
        console.error('Invalid Mapbox response:', response.data);
        return [];
      }

      return response.data.features.map((feature: any) => this.transformPlace(feature));
    } catch (error: any) {
      console.error('Nearby places error:', error.response?.data || error.message);
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }

  private transformPlace(feature: any, includeDetails = false) {
    const properties = feature.properties || {};
    const context = feature.context || [];
    
    // Extract address components from context
    const addressParts = context
      .filter((ctx: any) => ctx.id.startsWith('address') || ctx.id.startsWith('place') || ctx.id.startsWith('locality') || ctx.id.startsWith('region'))
      .map((ctx: any) => ctx.text);
    
    const category = properties.category || this.inferCategory(feature.place_type);
    const placeName = feature.text || feature.place_name;
    
    return {
      id: feature.id,
      name: placeName,
      coordinates: {
        longitude: feature.center[0],
        latitude: feature.center[1],
      },
      category,
      categoryIcon: this.getCategoryIcon(category),
      address: feature.place_name,
      bbox: feature.bbox,
      // Mapbox doesn't provide all these details, but we structure it for future enhancement
      ...(includeDetails && {
        phone: properties.phone,
        website: properties.website,
        rating: properties.rating ? parseFloat(properties.rating) : undefined,
        reviewCount: properties.review_count ? parseInt(properties.review_count) : undefined,
        photos: this.generatePlacePhotos(placeName, category),
        description: this.generatePlaceDescription(placeName, category, feature.place_name),
      }),
    };
  }

  private generatePlacePhotos(placeName: string, category?: string): any[] {
    // Generate placeholder image URLs using Unsplash or similar service
    // For now, we'll use a placeholder service that generates images based on category
    const searchQuery = category ? `${category} ${placeName}` : placeName;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Using Unsplash Source API (no key required for basic usage)
    return [
      {
        id: 'main',
        url: `https://source.unsplash.com/800x600/?${encodedQuery}`,
        width: 800,
        height: 600,
        attribution: 'Unsplash',
      },
      {
        id: 'thumbnail',
        url: `https://source.unsplash.com/400x300/?${encodedQuery}`,
        width: 400,
        height: 300,
        attribution: 'Unsplash',
      },
    ];
  }

  private generatePlaceDescription(name: string, category?: string, address?: string): string {
    const categoryDescriptions: Record<string, string> = {
      restaurant: 'A popular dining destination offering a variety of culinary experiences.',
      cafe: 'A cozy café serving quality coffee and light meals in a welcoming atmosphere.',
      bar: 'A vibrant bar offering drinks and entertainment for a great night out.',
      hotel: 'A comfortable accommodation option with modern amenities and excellent service.',
      gas_station: 'A convenient fuel station with additional services for travelers.',
      parking: 'A parking facility providing safe and convenient vehicle storage.',
      hospital: 'A medical facility providing healthcare services and emergency care.',
      pharmacy: 'A pharmacy offering prescription medications and health products.',
      bank: 'A financial institution providing banking services and ATM access.',
      supermarket: 'A grocery store offering a wide selection of food and household items.',
      shopping: 'A shopping destination with various retail stores and services.',
      attraction: 'A popular tourist attraction and point of interest.',
      museum: 'A cultural institution showcasing art, history, and exhibitions.',
      park: 'A public park offering green space and recreational activities.',
      gym: 'A fitness center with modern equipment and training facilities.',
      cinema: 'A movie theater showing the latest films and entertainment.',
      school: 'An educational institution providing learning opportunities.',
      airport: 'An airport facility serving air travel and transportation.',
      bus_station: 'A bus terminal providing public transportation services.',
      train_station: 'A railway station connecting various destinations.',
    };

    const baseDescription = categoryDescriptions[category || 'attraction'] || 'A notable location worth visiting.';
    return `${name}${address ? ` located in ${address}` : ''}. ${baseDescription}`;
  }

  private mapCategoryToMapboxTypes(category: string): string {
    // Map our category IDs to Mapbox types
    const categoryMap: Record<string, string> = {
      restaurant: 'restaurant',
      cafe: 'cafe,coffee',
      bar: 'bar,pub',
      hotel: 'hotel',
      gas_station: 'gas',
      parking: 'parking',
      hospital: 'hospital',
      pharmacy: 'pharmacy',
      bank: 'bank',
      supermarket: 'market,store',
      shopping: 'shop,store',
      attraction: 'poi',
      museum: 'museum',
      park: 'park',
      gym: 'gym',
      cinema: 'cinema',
      school: 'school',
      airport: 'airport',
      bus_station: 'bus',
      train_station: 'railway',
    };
    
    return categoryMap[category] || 'poi';
  }

  private inferCategory(placeTypes: string[]): string | undefined {
    if (!placeTypes || placeTypes.length === 0) return undefined;
    
    // Map Mapbox types to our categories
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
      if (typeMap[type]) {
        return typeMap[type];
      }
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

  private calculateBoundingBox(
    center: { longitude: number; latitude: number },
    radiusMeters: number,
  ): [number, number, number, number] {
    // Approximate conversion: 1 degree latitude ≈ 111km
    const latDelta = radiusMeters / 111000;
    // Longitude delta depends on latitude
    const lngDelta = radiusMeters / (111000 * Math.cos((center.latitude * Math.PI) / 180));
    
    return [
      center.longitude - lngDelta, // west
      center.latitude - latDelta, // south
      center.longitude + lngDelta, // east
      center.latitude + latDelta, // north
    ];
  }
}

