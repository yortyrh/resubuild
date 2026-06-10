import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthConfigService } from './config/auth.config';

@Injectable()
export class ForgotPasswordEnabledGuard implements CanActivate {
  constructor(private readonly authConfig: AuthConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.authConfig.get('AUTH_FORGOT_PASSWORD_ENABLED')) {
      throw new ForbiddenException('Password reset is not enabled');
    }
    return true;
  }
}
