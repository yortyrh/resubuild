import { Transform } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateAiAgentAccountDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[^/\s]+\/[^/\s]+(?:\/[^/\s]+)?$/, {
    message: 'modelId must use provider/model or gateway/provider/model format',
  })
  modelId?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  keepExistingApiKey?: boolean;

  /**
   * Provider options (reasoning effort, thinking…). Omitted or empty keys use the
   * provider default; checked against the provider's option list in the service.
   */
  @IsOptional()
  @IsObject()
  modelOptions?: Record<string, string | number>;
}
