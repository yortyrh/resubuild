import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GithubCallbackDto, LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';
import type { AuthMeResponse, AuthTokenResponse } from './session.types';
import { type AuthenticatedRequest, SupabaseAuthGuard } from './supabase-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<AuthTokenResponse> {
    return this.authService.login(dto);
  }

  @Post('register')
  @HttpCode(201)
  register(@Body() dto: RegisterDto): Promise<AuthTokenResponse | { message: string }> {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto): Promise<AuthTokenResponse> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(204)
  logout(): void {
    // Client discards tokens; optional server-side revocation can be added later.
  }

  @Get('github')
  @HttpCode(200)
  getGithubAuthUrl(): Promise<{ url: string }> {
    return this.authService.getGithubAuthUrl();
  }

  @Post('github/callback')
  @HttpCode(200)
  githubCallback(@Body() dto: GithubCallbackDto): Promise<AuthTokenResponse> {
    return this.authService.handleGithubCallback(dto);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  me(@Req() req: AuthenticatedRequest): AuthMeResponse {
    return {
      user: { id: req.user.id, email: req.user.email },
    };
  }
}
