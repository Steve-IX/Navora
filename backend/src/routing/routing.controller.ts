import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoutingRequest } from '@shared/types/routing';
import { IsArray, IsNotEmpty, ValidateNested, IsEnum, IsOptional, IsBoolean, IsIn, IsNumber, IsObject, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { RoutingProfile } from '@shared/types/routing';

class CoordinatesDto {
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}

class RouteWaypointDto {
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;

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
    try {
      return await this.routingService.getRoute(
        routingRequest.waypoints,
        routingRequest.profile,
        {
          alternatives: routingRequest.alternatives,
          geometries: routingRequest.geometries,
          overview: routingRequest.overview,
          steps: routingRequest.steps,
        },
      );
    } catch (error) {
      // Re-throw HttpException as-is to preserve status codes and messages
      if (error instanceof HttpException) {
        throw error;
      }
      // Log unexpected errors and wrap them
      console.error('Unexpected routing error:', error);
      throw new HttpException(
        error?.message || 'Failed to calculate route',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

