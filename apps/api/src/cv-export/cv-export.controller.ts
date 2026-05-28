import { Controller, Get, Header, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CvExportService } from './cv-export.service';

@Controller('cv')
@UseGuards(SupabaseAuthGuard)
export class CvExportController {
  constructor(private readonly exportService: CvExportService) {}

  @Get('export/templates')
  listTemplates() {
    return { templates: this.exportService.listTemplateCatalog() };
  }

  @Get(':id/export/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  exportHtml(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('template') template?: string,
  ): Promise<string> {
    return this.exportService.renderHtml(req.user, id, template);
  }

  @Get(':id/export/pdf')
  async exportPdf(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('template') template: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.exportService.renderPdf(req.user, id, template);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
