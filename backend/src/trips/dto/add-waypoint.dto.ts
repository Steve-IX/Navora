import { IsString, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Coordinates } from '@shared/types/geocoding';

class CoordinatesDto {
  @IsNumber()
  longitude: number;

  @IsNumber()
  latitude: number;
}

export class AddWaypointDto {
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: Coordinates;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  orderIndex?: number;
}

