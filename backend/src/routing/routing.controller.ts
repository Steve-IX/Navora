import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoutingRequest } from '@shared/types/routing';
import { IsArray, IsNotEmpty, ValidateNested, IsEnum, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { RoutingProfile } from '@shared/types/routing';

class RouteWaypointDto {
  @IsNotEmpty()
  coordinates: { longitude: number; latitude: number };

  @IsOptional()
  name?: string;
}

class RoutingRequestDto implements RoutingRequest {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteWaypointDto)
  waypoints: RouteWaypointDto[];

  @IsEnum(['driving', 'walking', 'cycling', 'driving-traffic', 'transit', 'flight'])
  profile: RoutingProfile;

  @IsOptional()
  @IsBoolean()
  alternatives?: boolean;

  @IsOptional()
  @IsIn(['geojson', 'polyline'])
  geometries?: 'geojson' | 'polyline';

  @IsOptional()
  @IsIn(['full', 'simplified', 'false'])
  overview?: 'full' | 'simplified' | 'false';

  @IsOptional()
  @IsBoolean()
  steps?: boolean;
}

@Controller('routing')
@UseGuards(JwtAuthGuard)
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('route')
  async getRoute(@Body() routingRequest: RoutingRequestDto) {
    return this.routingService.getRoute(
      routingRequest.waypoints,
      routingRequest.profile,
      {
        alternatives: routingRequest.alternatives,
        geometries: routingRequest.geometries,
        overview: routingRequest.overview,
        steps: routingRequest.steps,
      },
    );
  }
}

