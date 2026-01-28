import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateListDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
