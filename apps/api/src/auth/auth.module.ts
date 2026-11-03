import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BETTER_AUTH } from './better-auth';
import { betterAuthProvider } from './better-auth.provider';
import { AuthConfigService } from './config/auth.config';
import { OAuthHandoffService } from './oauth-handoff.service';
import { SessionAuthGuard } from './session-auth.guard';

/**
 * Global so `@UseGuards(SessionAuthGuard)` resolves `BETTER_AUTH` in every
 * feature module without each one importing AuthModule.
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthConfigService,
    OAuthHandoffService,
    SessionAuthGuard,
    betterAuthProvider,
  ],
  exports: [AuthService, AuthConfigService, SessionAuthGuard, BETTER_AUTH],
})
export class AuthModule {}
