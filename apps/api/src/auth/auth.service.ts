import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session } from '@supabase/supabase-js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GithubCallbackDto, LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';
import type { AuthTokenResponse } from './session.types';

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  private getBrowserClient(): SupabaseClient {
    const url = this.configService.get<string>('SUPABASE_URL');
    const anonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    if (!url || !anonKey) {
      throw new UnauthorizedException('Server auth is not configured');
    }
    return createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  private toTokenResponse(session: Session | null): AuthTokenResponse {
    if (!session?.access_token || !session.refresh_token) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = session.user;
    if (!user?.id) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in ?? 3600,
      expires_at: session.expires_at ?? undefined,
      token_type: 'bearer',
      user: { id: user.id, email: user.email ?? undefined },
    };
  }

  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const supabase = this.getBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });
    if (error || !data.session) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.toTokenResponse(data.session);
  }

  async register(dto: RegisterDto): Promise<AuthTokenResponse | { message: string }> {
    const supabase = this.getBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
    });
    if (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (data.session) {
      return this.toTokenResponse(data.session);
    }
    return {
      message: 'Check your email to confirm your account, then sign in.',
    };
  }

  async refresh(dto: RefreshDto): Promise<AuthTokenResponse> {
    const supabase = this.getBrowserClient();
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: dto.refresh_token,
    });
    if (error || !data.session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.toTokenResponse(data.session);
  }

  async getGithubAuthUrl(): Promise<{ url: string }> {
    const supabase = this.getBrowserClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${this.configService.get<string>('APP_URL')}/auth/callback`,
      },
    });
    if (error || !data.url) {
      throw new UnauthorizedException('Failed to initiate GitHub sign-in');
    }
    return { url: data.url };
  }

  async handleGithubCallback(dto: GithubCallbackDto): Promise<AuthTokenResponse> {
    const supabase = this.getBrowserClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(dto.code);
    if (error || !data.session) {
      throw new UnauthorizedException('GitHub sign-in failed');
    }
    return this.toTokenResponse(data.session);
  }
}
