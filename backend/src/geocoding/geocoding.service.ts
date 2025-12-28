import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GeocodeResult, Coordinates } from '@shared/types/geocoding';

@Injectable()
export class GeocodingService {
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

  async forwardGeocode(query: string, options?: {
    proximity?: Coordinates;
    bbox?: [number, number, number, number];
    limit?: number;
  }): Promise<GeocodeResult[]> {
    try {
      const proximityParam = options?.proximity
        ? `&proximity=${options.proximity.longitude},${options.proximity.latitude}`
        : '';
      const bboxParam = options?.bbox
        ? `&bbox=${options.bbox.join(',')}`
        : '';
      const limitParam = options?.limit ? `&limit=${options.limit}` : '&limit=10';

      const url = `${this.mapboxApiUrl}/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxAccessToken}${proximityParam}${bboxParam}${limitParam}`;

      const response = await firstValueFrom(this.httpService.get(url));

      return response.data.features.map((feature: any) => ({
        id: feature.id,
        placeName: feature.place_name,
        coordinates: {
          longitude: feature.center[0],
          latitude: feature.center[1],
        },
        context: feature.context?.map((ctx: any) => ({
          id: ctx.id,
          text: ctx.text,
          shortCode: ctx.short_code,
        })),
        category: feature.properties?.category,
        bbox: feature.bbox,
      }));
    } catch (error) {
      throw new HttpException(
        'Geocoding request failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async reverseGeocode(coordinates: Coordinates, limit = 1): Promise<GeocodeResult[]> {
    try {
      const url = `${this.mapboxApiUrl}/mapbox.places/${coordinates.longitude},${coordinates.latitude}.json?access_token=${this.mapboxAccessToken}&limit=${limit}`;

      const response = await firstValueFrom(this.httpService.get(url));

      return response.data.features.map((feature: any) => ({
        id: feature.id,
        placeName: feature.place_name,
        coordinates: {
          longitude: feature.center[0],
          latitude: feature.center[1],
        },
        context: feature.context?.map((ctx: any) => ({
          id: ctx.id,
          text: ctx.text,
          shortCode: ctx.short_code,
        })),
        category: feature.properties?.category,
        bbox: feature.bbox,
      }));
    } catch (error) {
      throw new HttpException(
        'Reverse geocoding request failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async autocomplete(query: string, options?: {
    proximity?: Coordinates;
    limit?: number;
  }): Promise<GeocodeResult[]> {
    // Same as forward geocode but with autocomplete=true
    return this.forwardGeocode(query, {
      ...options,
      limit: options?.limit || 5,
    });
  }
}

