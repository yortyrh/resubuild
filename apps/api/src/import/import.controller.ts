import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ImportFromUrlDto } from './dto/import-from-url.dto';
import { ImportService, PDF_IMPORT_MAX_BYTES_DEFAULT } from './import.service';

@Controller('cv/import')
@UseGuards(SupabaseAuthGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('pdf')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.PDF_IMPORT_MAX_BYTES ?? PDF_IMPORT_MAX_BYTES_DEFAULT),
      },
    }),
  )
  startPdfImport(@Req() req: AuthenticatedRequest, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Expected multipart field "file"');
    }

    return this.importService.startPdfImport(req.user, file);
  }

  @Post('from-url')
  @HttpCode(HttpStatus.OK)
  importFromUrl(@Req() req: AuthenticatedRequest, @Body() dto: ImportFromUrlDto) {
    return this.importService.importFromUrl(req.user, dto.url);
  }

  @Get(':jobId')
  getJob(@Req() req: AuthenticatedRequest, @Param('jobId') jobId: string) {
    return this.importService.getJob(req.user, jobId);
  }
}
