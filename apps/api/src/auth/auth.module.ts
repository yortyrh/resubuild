import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config/auth.config';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthConfigService, SupabaseAuthGuard],
  exports: [AuthService, AuthConfigService, SupabaseAuthGuard],
})
export class AuthModule {}
