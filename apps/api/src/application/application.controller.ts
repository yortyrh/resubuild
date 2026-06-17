import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CvExportService } from '../cv-export/cv-export.service';
import { PDF_IMPORT_MAX_BYTES_DEFAULT } from '../import/import.service';
import { APPLICATION_IMAGE_MIME_TYPES, ApplicationService } from './application.service';
import {
  PrepareApplicationFieldsDto,
  UpdateApplicationDto,
  UpdateApplicationLetterDto,
  UpdateApplicationMetadataDto,
} from './dto/application.dto';

@Controller('applications')
@UseGuards(SupabaseAuthGuard)
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly exportService: CvExportService,
  ) {}

  @Post('prepare')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.PDF_IMPORT_MAX_BYTES ?? PDF_IMPORT_MAX_BYTES_DEFAULT),
      },
    }),
  )
  prepare(
    @Req() req: AuthenticatedRequest,
    @Body() fields: PrepareApplicationFieldsDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (
      file &&
      file.mimetype !== 'application/pdf' &&
      !APPLICATION_IMAGE_MIME_TYPES.has(file.mimetype)
    ) {
      throw new BadRequestException('File must be PDF or image (PNG, JPEG, WebP)');
    }

    return this.applicationService.prepare(req.user, {
      url: fields.url,
      text: fields.text,
      message: fields.message,
      sourceCvId: fields.sourceCvId,
      file,
    });
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.applicationService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.applicationService.findOne(req.user, id);
  }

  @Patch(':id')
  updateLetter(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationLetterDto,
  ) {
    return this.applicationService.updateCoverLetter(req.user, id, dto.coverLetter);
  }

  @Patch(':id/metadata')
  updateMetadata(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationMetadataDto,
  ) {
    return this.applicationService.patchApplicationMetadata(req.user, id, {
      jobTitle: dto.jobTitle,
      jobCompany: dto.jobCompany,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.applicationService.remove(req.user, id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.applicationService.cancel(req.user, id);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  retry(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.applicationService.retry(req.user, id);
  }

  @Post(':id/update')
  @HttpCode(HttpStatus.ACCEPTED)
  updateApplication(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationService.updateApplication(req.user, id, {
      message: dto.message,
      sourceCvId: dto.sourceCvId,
    });
  }

  @Post(':id/promote-clone')
  promoteClone(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.applicationService.promoteClone(req.user, id);
  }

  @Get(':id/export/letter/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async exportLetterHtml(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<string> {
    const markdown = await this.applicationService.getCoverLetterMarkdown(req.user, id);
    return this.exportService.renderLetterHtml(markdown, {
      title: 'Cover letter',
    });
  }

  @Get(':id/export/letter/pdf')
  async exportLetterPdf(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { markdown, filename: exportFilename } =
      await this.applicationService.getCoverLetterPdfExport(req.user, id);
    const { buffer, filename } = await this.exportService.renderLetterPdf(markdown, {
      title: 'Cover letter',
      filename: exportFilename,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
