import { IsString, IsOptional, IsIn, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class GetWeatherDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @IsIn(['m', 's', 'f'])
  units?: 'm' | 's' | 'f';
}

export class GetWeatherByCoordinatesDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  lon: number;

  @IsOptional()
  @IsIn(['m', 's', 'f'])
  units?: 'm' | 's' | 'f';
}
