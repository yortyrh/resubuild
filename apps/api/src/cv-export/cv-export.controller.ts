import { Controller, Get, Header, Param, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CvExportService } from './cv-export.service';

@Controller('cv')
@UseGuards(SupabaseAuthGuard)
export class CvExportController {
  constructor(private readonly exportService: CvExportService) {}

  @Get(':id/export/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  exportHtml(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<string> {
    return this.exportService.renderHtml(req.user, id);
  }

  @Get(':id/export/pdf')
  async exportPdf(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.exportService.renderPdf(req.user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
