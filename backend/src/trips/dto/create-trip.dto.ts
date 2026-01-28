import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateTripDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
