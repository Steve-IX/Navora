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

      // Handle flight routing separately (great-circle distance)
      if (profile === 'flight') {
        return this.calculateFlightRoute(waypoints);
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
      flight: 'driving', // Flight is handled separately, this should never be called
    };
    return mapping[profile] || 'driving';
  }

  /**
   * Calculate flight route using great-circle distance
   * This creates a straight-line route between waypoints (as flights follow great-circle paths)
   */
  private calculateFlightRoute(waypoints: RouteWaypoint[]): RoutingResponse {
    const coordinates: Array<{ longitude: number; latitude: number }> = [];
    let totalDistance = 0;

    // Calculate distances and create route geometry
    for (let i = 0; i < waypoints.length; i++) {
      const wp = waypoints[i];
      coordinates.push(wp.coordinates);

      if (i > 0) {
        const prevWp = waypoints[i - 1];
        const distance = this.calculateGreatCircleDistance(
          prevWp.coordinates,
          wp.coordinates,
        );
        totalDistance += distance;
      }
    }

    // Average commercial flight speed: ~900 km/h (250 m/s)
    // Add 1 hour for takeoff/landing procedures
    const flightSpeedMps = 250; // meters per second
    const flightDuration = totalDistance / flightSpeedMps + 3600; // +1 hour for procedures

    // Create a smooth great-circle path (simplified with intermediate points)
    const routeCoordinates = this.generateGreatCirclePath(coordinates);

    const route: Route = {
      distance: totalDistance,
      duration: flightDuration,
      geometry: {
        coordinates: routeCoordinates,
      },
      legs: [
        {
          distance: totalDistance,
          duration: flightDuration,
          steps: [
            {
              distance: totalDistance,
              duration: flightDuration,
              instruction: 'Fly direct to destination',
              maneuver: {
                type: 'depart',
                location: waypoints[0].coordinates,
              },
            },
          ],
        },
      ],
      weight: flightDuration,
      weightName: 'duration',
    };

    return {
      code: 'Ok',
      routes: [route],
      waypoints: waypoints.map((wp) => ({
        location: wp.coordinates,
        name: wp.name,
      })),
    };
  }

  /**
   * Calculate great-circle distance between two points using Haversine formula
   * Returns distance in meters
   */
  private calculateGreatCircleDistance(
    point1: { longitude: number; latitude: number },
    point2: { longitude: number; latitude: number },
  ): number {
    const R = 6371000; // Earth radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Generate great-circle path between waypoints
   * Creates intermediate points to form a smooth arc
   */
  private generateGreatCirclePath(
    waypoints: Array<{ longitude: number; latitude: number }>,
  ): Array<{ longitude: number; latitude: number }> {
    if (waypoints.length < 2) {
      return waypoints;
    }

    const path: Array<{ longitude: number; latitude: number }> = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];

      // Add start point
      if (i === 0) {
        path.push(start);
      }

      // Generate intermediate points for smooth arc (10 points between waypoints)
      const numPoints = 10;
      for (let j = 1; j < numPoints; j++) {
        const fraction = j / numPoints;
        const intermediate = this.interpolateGreatCircle(start, end, fraction);
        path.push(intermediate);
      }

      // Add end point
      path.push(end);
    }

    return path;
  }

  /**
   * Interpolate a point along a great-circle path
   */
  private interpolateGreatCircle(
    start: { longitude: number; latitude: number },
    end: { longitude: number; latitude: number },
    fraction: number,
  ): { longitude: number; latitude: number } {
    const lat1 = (start.latitude * Math.PI) / 180;
    const lat2 = (end.latitude * Math.PI) / 180;
    const lon1 = (start.longitude * Math.PI) / 180;
    const lon2 = (end.longitude * Math.PI) / 180;

    const d = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1),
    );

    if (d === 0) {
      return { longitude: start.longitude, latitude: start.latitude };
    }

    const a = Math.sin((1 - fraction) * d) / Math.sin(d);
    const b = Math.sin(fraction * d) / Math.sin(d);

    const x =
      a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y =
      a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    return {
      latitude: (lat * 180) / Math.PI,
      longitude: (lon * 180) / Math.PI,
    };
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

