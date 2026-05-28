import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CvModule } from './cv/cv.module';
import { ImportModule } from './import/import.module';
import { ImportLlmConfigModule } from './import-llm-config/import-llm-config.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    CvModule,
    MediaModule,
    ImportLlmConfigModule,
    ImportModule,
  ],
})
export class AppModule {}
