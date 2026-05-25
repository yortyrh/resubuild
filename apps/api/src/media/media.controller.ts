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
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { type AuthenticatedRequest, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { MediaService } from './media.service';
import { CropRectDto } from './media-crop.dto';
import { RESUME_UPLOAD_MAX_BYTES_DEFAULT } from './media-upload.types';

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

  @Patch(':id/crop')
  @UseGuards(SupabaseAuthGuard)
  async crop(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CropRectDto,
  ) {
    return this.mediaService.cropMedia(req.user.id, id, body);
  }

  @Delete(':id')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.mediaService.deleteMedia(req.user.id, id);
  }

  @Get(':id/meta')
  @UseGuards(SupabaseAuthGuard)
  async meta(
    @Req() req: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.mediaService.getMediaMeta(req.user.id, id);
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
