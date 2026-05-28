import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class SaveImportLlmConfigDto {
  @IsString()
  @Matches(/^[^/\s]+\/[^/\s]+(?:\/[^/\s]+)?$/, {
    message: 'modelId must use provider/model or gateway/provider/model format',
  })
  modelId!: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  keepExistingApiKey?: boolean;
}
