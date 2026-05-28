import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

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
}
