import { IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAiAgentAccountDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @Matches(/^[^/\s]+\/[^/\s]+(?:\/[^/\s]+)?$/, {
    message: 'modelId must use provider/model or gateway/provider/model format',
  })
  modelId!: string;

  @IsString()
  apiKey!: string;

  /**
   * Provider options (reasoning effort, thinking…). Omitted or empty keys use the
   * provider default; checked against the provider's option list in the service.
   */
  @IsOptional()
  @IsObject()
  modelOptions?: Record<string, string | number>;
}
