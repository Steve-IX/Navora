import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  RoutingRequest,
  RoutingResponse,
  RoutingProfile,
  RouteWaypoint,
  Route,
} from '@shared/types/routing';

@Injectable()
export class RoutingService {
  private readonly mapboxAccessToken: string;
  private readonly mapboxApiUrl = 'https://api.mapbox.com/directions/v5';

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.mapboxAccessToken = this.configService.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!this.mapboxAccessToken) {
      throw new Error('MAPBOX_ACCESS_TOKEN is required');
    }
  }

  async getRoute(
    waypoints: RouteWaypoint[],
    profile: RoutingProfile,
    options?: {
      alternatives?: boolean;
      geometries?: 'geojson' | 'polyline';
      overview?: 'full' | 'simplified' | 'false';
      steps?: boolean;
    },
  ): Promise<RoutingResponse> {
    try {
      if (waypoints.length < 2) {
        throw new HttpException(
          'At least two waypoints are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Map profile names (our internal names may differ from Mapbox)
      const mapboxProfile = this.mapProfileToMapbox(profile);

      // Build coordinates string: lng,lat;lng,lat;...
      const coordinates = waypoints
        .map((wp) => `${wp.coordinates.longitude},${wp.coordinates.latitude}`)
        .join(';');

      const alternatives = options?.alternatives ? 'true' : 'false';
      const geometries = options?.geometries || 'geojson';
      const overview = options?.overview || 'full';
      const steps = options?.steps !== false ? 'true' : 'false';

      const url = `${this.mapboxApiUrl}/mapbox/${mapboxProfile}/${coordinates}?access_token=${this.mapboxAccessToken}&alternatives=${alternatives}&geometries=${geometries}&overview=${overview}&steps=${steps}`;

      const response = await firstValueFrom(this.httpService.get(url));

      // Transform Mapbox response to our RoutingResponse format
      return this.transformMapboxResponse(response.data, waypoints);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Routing request failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapProfileToMapbox(profile: RoutingProfile): string {
    const mapping: Record<RoutingProfile, string> = {
      driving: 'driving',
      'driving-traffic': 'driving-traffic',
      walking: 'walking',
      cycling: 'cycling',
      transit: 'driving', // Mapbox transit requires different endpoint, using driving as fallback
    };
    return mapping[profile] || 'driving';
  }

  private transformMapboxResponse(
    mapboxData: any,
    waypoints: RouteWaypoint[],
  ): RoutingResponse {
    const routes: Route[] = mapboxData.routes.map((route: any) => ({
      distance: route.distance,
      duration: route.duration,
      geometry: {
        coordinates: route.geometry.coordinates.map((coord: [number, number]) => ({
          longitude: coord[0],
          latitude: coord[1],
        })),
      },
      legs: route.legs.map((leg: any) => ({
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps?.map((step: any) => ({
          distance: step.distance,
          duration: step.duration,
          instruction: step.maneuver.instruction || step.maneuver.type,
          maneuver: {
            type: step.maneuver.type,
            modifier: step.maneuver.modifier,
            bearing_after: step.maneuver.bearing_after,
            bearing_before: step.maneuver.bearing_before,
            location: {
              longitude: step.maneuver.location[0],
              latitude: step.maneuver.location[1],
            },
          },
          geometry: step.geometry
            ? {
                coordinates: step.geometry.coordinates.map((coord: [number, number]) => ({
                  longitude: coord[0],
                  latitude: coord[1],
                })),
              }
            : undefined,
        })) || [],
      })),
      weight: route.weight,
      weightName: route.weight_name,
    }));

    return {
      code: mapboxData.code,
      routes,
      waypoints: mapboxData.waypoints.map((wp: any, index: number) => ({
        location: {
          longitude: wp.location[0],
          latitude: wp.location[1],
        },
        name: waypoints[index]?.name,
      })),
    };
  }
}

