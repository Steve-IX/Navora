import { IsOptional, IsUUID, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Coordinates } from '@shared/types/geocoding';

class CoordinatesDto {
  @IsNumber()
  longitude: number;

  @IsNumber()
  latitude: number;
}

export class CreateLocationShareDto {
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: Coordinates;

  @IsOptional()
  @IsUUID()
  sharedWithId?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  expiresInMinutes?: number;
}

