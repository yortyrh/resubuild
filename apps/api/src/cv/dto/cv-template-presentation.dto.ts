import { IsObject, IsString, MinLength } from 'class-validator';

export class UpsertCvTemplatePresentationDto {
  @IsObject()
  config!: Record<string, unknown>;
}

export class CvTemplatePresentationQueryDto {
  @IsString()
  @MinLength(1)
  template!: string;
}
