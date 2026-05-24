import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { RESUME_UPLOAD_MAX_BYTES_DEFAULT } from './media-upload.types';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(SupabaseAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.MEDIA_MAX_BYTES ?? RESUME_UPLOAD_MAX_BYTES_DEFAULT),
      },
    }),
  )
  upload(@Req() req: AuthenticatedRequest, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Expected multipart field "file"');
    }

    return this.mediaService.uploadObject(req.user.id, file);
  }

  /**
   * Public read by opaque id (no Bearer). Suitable for `<img src>` in Markdown.
   * Security: treat id as a capability token; do not publish ids you want private.
   */
  @Get(':id')
  @Header('Cache-Control', 'public, max-age=86400, immutable')
  async stream(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const { buffer, contentType } = await this.mediaService.loadMediaPayload(id);
    return new StreamableFile(buffer, {
      type: contentType,
      disposition: 'inline',
    });
  }
}
