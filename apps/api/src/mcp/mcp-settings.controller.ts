import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateMcpKeyDto, PatchMcpSettingsDto } from './dto/mcp-settings.dto';
import { McpSettingsService } from './mcp-settings.service';

@Controller('settings/mcp')
@UseGuards(SupabaseAuthGuard)
export class McpSettingsController {
  constructor(private readonly mcpSettingsService: McpSettingsService) {}

  @Get()
  getSettings(@Req() req: AuthenticatedRequest) {
    return this.mcpSettingsService.getSettings(req.user);
  }

  @Patch()
  patchSettings(@Req() req: AuthenticatedRequest, @Body() body: PatchMcpSettingsDto) {
    return this.mcpSettingsService.patchSettings(req.user, body.mcpEnabled);
  }

  @Post('keys')
  createKey(@Req() req: AuthenticatedRequest, @Body() body: CreateMcpKeyDto) {
    return this.mcpSettingsService.createKey(req.user, body.label);
  }

  @Delete('keys/:id')
  @HttpCode(HttpStatus.OK)
  revokeKey(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mcpSettingsService.revokeKey(req.user, id);
  }
}
