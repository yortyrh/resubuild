import { IsBoolean, IsOptional } from 'class-validator';

export class PatchMcpSettingsDto {
  @IsOptional()
  @IsBoolean()
  mcpEnabled?: boolean;
}

export class CreateMcpKeyDto {}
