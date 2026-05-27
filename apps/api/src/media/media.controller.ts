import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { ImportMediaGravatarDto } from './media-import-gravatar.dto';
import { ImportMediaUrlDto } from './media-import-url.dto';
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

  @Post('import-url')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async importFromUrl(@Req() req: AuthenticatedRequest, @Body() body: ImportMediaUrlDto) {
    const result = await this.mediaService.importFromUrl(req.user.id, body.url);
    if (!result) {
      throw new NotFoundException('Image URL is not reachable or is not a supported image');
    }
    return result;
  }

  @Post('import-url/check')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkImportUrl(@Body() body: ImportMediaUrlDto) {
    const importable = await this.mediaService.canImportImageFromUrl(body.url);
    return { importable };
  }

  @Post('import-gravatar')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async importFromGravatar(@Req() req: AuthenticatedRequest, @Body() body: ImportMediaGravatarDto) {
    const result = await this.mediaService.importFromGravatarEmail(req.user.id, body.email);
    if (!result) {
      throw new NotFoundException('No Gravatar found for this email');
    }
    return result;
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
   * Public thumbnail read (no Bearer). Editor preview only; ≤150×150 aspect-preserving WebP.
   */
  @Get(':id/thumbnail')
  @Header('Cache-Control', 'public, max-age=86400, immutable')
  async streamThumbnail(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const { buffer, contentType } = await this.mediaService.loadThumbnailPayload(id);
    return new StreamableFile(buffer, {
      type: contentType,
      disposition: 'inline',
    });
  }

  /**
   * Public original upload (no Bearer). Used by the crop editor; crop rectangles are in original pixel space.
   */
  @Get(':id/original')
  @Header('Cache-Control', 'public, max-age=86400, immutable')
  async streamOriginal(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const { buffer, contentType } = await this.mediaService.loadOriginalPayload(id);
    return new StreamableFile(buffer, {
      type: contentType,
      disposition: 'inline',
    });
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
