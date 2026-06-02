import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
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

  @Post('key')
  createKey(@Req() req: AuthenticatedRequest, @Body() _body: CreateMcpKeyDto) {
    return this.mcpSettingsService.createKey(req.user);
  }
}
