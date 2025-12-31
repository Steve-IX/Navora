import { IsString, IsNumber, IsOptional, Min, Max, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { Coordinates } from '@shared/types/geocoding';

class CoordinatesDto {
  @IsNotEmpty()
  longitude: number;

  @IsNotEmpty()
  latitude: number;
}

export class CreateReviewDto {
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: Coordinates;

  @IsString()
  placeName: string;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

