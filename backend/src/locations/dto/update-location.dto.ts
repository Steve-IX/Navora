import { IsOptional, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CoordinatesDto {
  longitude: number;
  latitude: number;
}

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  @IsOptional()
  coordinates?: CoordinatesDto;

  @IsString()
  @IsOptional()
  category?: string;
}

