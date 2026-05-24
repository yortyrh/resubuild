import { Module } from '@nestjs/common';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ResumeSchemaValidator } from '../validation/resume-schema.validator';

@Module({
  controllers: [CvController],
  providers: [CvService, SupabaseAuthGuard, ResumeSchemaValidator],
})
export class CvModule {}
