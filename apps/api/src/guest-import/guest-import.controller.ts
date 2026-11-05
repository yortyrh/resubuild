import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { PDF_IMPORT_MAX_BYTES_DEFAULT } from '../import/import.service';
import { GuestImportUrlDto } from './dto/guest-import-url.dto';
import { GuestImportService } from './guest-import.service';

export const TURNSTILE_HEADER = 'cf-turnstile-response';
export const GUEST_TOKEN_HEADER = 'x-guest-import-token';

/** Anonymous CV import for the sign-up wizard (no session). */
@Controller('public/import')
export class GuestImportController {
  constructor(private readonly guestImport: GuestImportService) {}

  @Get('status')
  getStatus() {
    return this.guestImport.getStatus();
  }

  @Post('file')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.PDF_IMPORT_MAX_BYTES ?? PDF_IMPORT_MAX_BYTES_DEFAULT),
      },
    }),
  )
  startFile(
    @Req() req: Request,
    @Headers(TURNSTILE_HEADER) turnstileToken?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Expected multipart field "file"');
    }
    return this.guestImport.startFileImport(file, { ip: clientIp(req), turnstileToken });
  }

  @Post('url')
  startUrl(
    @Req() req: Request,
    @Body() body: GuestImportUrlDto,
    @Headers(TURNSTILE_HEADER) turnstileToken?: string,
  ) {
    return this.guestImport.startUrlImport(body.url, { ip: clientIp(req), turnstileToken });
  }

  @Get('jobs/:jobId')
  getJob(@Param('jobId') jobId: string, @Headers(GUEST_TOKEN_HEADER) guestToken?: string) {
    return this.guestImport.getJob(jobId, guestToken);
  }
}

/** Client address (honours `TRUST_PROXY` through Express `req.ip`). */
function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
