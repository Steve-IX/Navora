import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../common/decorators/public.decorator';
import { FlightawareService } from './flightaware.service';
import { FlightDetailsResponse, LiveFlightsResponse } from './types';

class LiveFlightsQueryDto {
  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  bbox?: string;

  @IsOptional()
  @IsString()
  airline?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minAltitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAltitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minSpeed?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxSpeed?: number;

  @IsOptional()
  @IsString()
  destinationCountry?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  max?: number;
}

@Controller('api/flights')
export class FlightawareController {
  constructor(private readonly flightawareService: FlightawareService) {}

  @Public()
  @Get('live')
  async getLiveFlights(@Query() query: LiveFlightsQueryDto): Promise<LiveFlightsResponse> {
    return this.flightawareService.getLiveFlights(query);
  }

  @Public()
  @Get(':id')
  async getFlightDetails(@Param('id') id: string): Promise<FlightDetailsResponse> {
    return this.flightawareService.getFlightDetails(id);
  }
}
