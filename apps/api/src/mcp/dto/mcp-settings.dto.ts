import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchMcpSettingsDto {
  @IsOptional()
  @IsBoolean()
  mcpEnabled?: boolean;
}

export class CreateMcpKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
