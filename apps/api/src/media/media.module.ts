import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

/**
 * Authenticated multipart uploads persisted to Supabase Storage (bucket from MEDIA_BUCKET).
 * {@link AuthModule} is imported so SupabaseAuthGuard stays available alongside CvModule parity.
 */
@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
