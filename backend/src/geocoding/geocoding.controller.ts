import { Controller, Get, Query, Param, UseGuards, ParseFloatPipe } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('geocoding')
@UseGuards(JwtAuthGuard)
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('forward')
  async forwardGeocode(@Query('query') query: string) {
    if (!query) {
      return [];
    }
    return this.geocodingService.forwardGeocode(query);
  }

  @Get('reverse')
  async reverseGeocode(
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('lat', ParseFloatPipe) lat: number,
  ) {
    return this.geocodingService.reverseGeocode({ longitude: lng, latitude: lat });
  }

  @Get('autocomplete')
  async autocomplete(@Query('query') query: string) {
    if (!query) {
      return [];
    }
    return this.geocodingService.autocomplete(query);
  }
}
