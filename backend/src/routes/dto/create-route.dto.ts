import { IsArray, IsNotEmpty, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CoordinateDto {
  @IsNumber()
  longitude: number;

  @IsNumber()
  latitude: number;
}

export class CreateRouteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  waypoints: CoordinateDto[];

  @IsNumber()
  distance: number; // in meters

  @IsNumber()
  duration: number; // in seconds

  @IsString()
  @IsNotEmpty()
  mode: string;
}

