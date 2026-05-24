import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCvDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsObject()
  data!: Record<string, unknown>;
}

export class UpdateCvDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
