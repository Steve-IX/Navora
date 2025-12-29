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

      return response.data.features.map((feature: any) => this.transformPlace(feature));
    } catch (error) {
      throw new HttpException(
        'Places search failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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

      return this.transformPlace(response.data.features[0], true);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get place details',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getNearbyPlaces(coordinates: { longitude: number; latitude: number }, options?: {
    category?: string;
    radius?: number; // in meters
    limit?: number;
  }) {
    try {
      // Use reverse geocoding with proximity and category filter
      const query = options?.category || 'poi'; // Point of Interest
      const radius = options?.radius || 1000; // 1km default
      
      // Calculate bounding box from radius
      const bbox = this.calculateBoundingBox(coordinates, radius);
      
      return this.searchPlaces(query, {
        category: options?.category,
        coordinates,
        bbox,
        limit: options?.limit || 20,
      });
    } catch (error) {
      throw new HttpException(
        'Nearby places search failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private transformPlace(feature: any, includeDetails = false) {
    const properties = feature.properties || {};
    const context = feature.context || [];
    
    // Extract address components from context
    const addressParts = context
      .filter((ctx: any) => ctx.id.startsWith('address') || ctx.id.startsWith('place') || ctx.id.startsWith('locality') || ctx.id.startsWith('region'))
      .map((ctx: any) => ctx.text);
    
    return {
      id: feature.id,
      name: feature.text || feature.place_name,
      coordinates: {
        longitude: feature.center[0],
        latitude: feature.center[1],
      },
      category: properties.category || this.inferCategory(feature.place_type),
      categoryIcon: this.getCategoryIcon(properties.category || this.inferCategory(feature.place_type)),
      address: feature.place_name,
      bbox: feature.bbox,
      // Mapbox doesn't provide all these details, but we structure it for future enhancement
      ...(includeDetails && {
        phone: properties.phone,
        website: properties.website,
        rating: properties.rating ? parseFloat(properties.rating) : undefined,
        reviewCount: properties.review_count ? parseInt(properties.review_count) : undefined,
      }),
    };
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

