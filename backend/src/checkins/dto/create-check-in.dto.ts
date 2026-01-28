import { IsString, IsOptional, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { Coordinates } from '@shared/types/geocoding';

class CoordinatesDto {
  @IsNotEmpty()
  longitude: number;

  @IsNotEmpty()
  latitude: number;
}

export class CreateCheckInDto {
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: Coordinates;

  @IsString()
  placeName: string;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
