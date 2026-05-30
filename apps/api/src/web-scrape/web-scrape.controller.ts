import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SaveWebScrapeConfigDto } from './dto/save-web-scrape-config.dto';
import { WebScrapeService } from './web-scrape.service';

@Controller('web-scrape')
@UseGuards(SupabaseAuthGuard)
export class WebScrapeController {
  constructor(private readonly webScrapeService: WebScrapeService) {}

  @Get('config')
  getConfig(@Req() req: AuthenticatedRequest) {
    return this.webScrapeService.getStatus(req.user);
  }

  @Put('config')
  saveConfig(@Req() req: AuthenticatedRequest, @Body() body: SaveWebScrapeConfigDto) {
    return this.webScrapeService.save(req.user, body);
  }

  @Delete('config')
  @HttpCode(HttpStatus.OK)
  clearConfig(@Req() req: AuthenticatedRequest) {
    return this.webScrapeService.clear(req.user);
  }
}
