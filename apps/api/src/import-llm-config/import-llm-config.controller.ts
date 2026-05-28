import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SaveImportLlmConfigDto } from './dto/save-import-llm-config.dto';
import { ImportLlmConfigService } from './import-llm-config.service';

@Controller('import/llm')
@UseGuards(SupabaseAuthGuard)
export class ImportLlmConfigController {
  constructor(private readonly importLlmConfigService: ImportLlmConfigService) {}

  @Get('providers')
  listProviders() {
    return this.importLlmConfigService.listProviders();
  }

  @Get('providers/:providerId/models')
  listModels(@Param('providerId') providerId: string) {
    return this.importLlmConfigService.listModels(providerId);
  }

  @Get('config')
  getConfig(@Req() req: AuthenticatedRequest) {
    return this.importLlmConfigService.getConfig(req.user);
  }

  @Put('config')
  saveConfig(@Req() req: AuthenticatedRequest, @Body() body: SaveImportLlmConfigDto) {
    return this.importLlmConfigService.saveConfig(req.user, body);
  }
}
