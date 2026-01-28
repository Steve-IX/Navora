import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { PlacesService } from './places.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class SearchPlacesDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(10)
  limit?: number;
}

class NearbyPlacesDto {
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radius?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(20)
  limit?: number;
}

@Controller('places')
@UseGuards(JwtAuthGuard)
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  async searchPlaces(@Query() dto: SearchPlacesDto) {
    return this.placesService.searchPlaces(dto.query, {
      category: dto.category,
      coordinates:
        dto.longitude && dto.latitude
          ? { longitude: dto.longitude, latitude: dto.latitude }
          : undefined,
      limit: dto.limit,
    });
  }

  @Get('nearby')
  @Throttle({ default: { limit: 200, ttl: 60000 } }) // 200 requests per minute for nearby places
  async getNearbyPlaces(@Query() dto: NearbyPlacesDto) {
    return this.placesService.getNearbyPlaces(
      { longitude: dto.longitude, latitude: dto.latitude },
      {
        category: dto.category,
        radius: dto.radius,
        limit: dto.limit,
      },
    );
  }

  @Get(':id')
  async getPlaceDetails(@Param('id') id: string) {
    return this.placesService.getPlaceDetails(id);
  }
}
