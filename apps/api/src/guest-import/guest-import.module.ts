import { Module } from '@nestjs/common';
import { AiHostedModule } from '../ai-hosted/ai-hosted.module';
import { ImportModule } from '../import/import.module';
import { GuestImportConfig } from './guest-import.config';
import { GuestImportController } from './guest-import.controller';
import { GuestImportService } from './guest-import.service';
import { TurnstileService } from './turnstile.service';

@Module({
  imports: [ImportModule, AiHostedModule],
  controllers: [GuestImportController],
  providers: [GuestImportConfig, TurnstileService, GuestImportService],
})
export class GuestImportModule {}
