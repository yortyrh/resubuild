import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');

@Injectable()
export class SupabaseClientProvider {
  constructor(private readonly configService: ConfigService) {}

  getClient(): SupabaseClient {
    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceRoleKey) {
      throw new UnauthorizedException('Server auth is not configured');
    }

    return createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
}

export const SUPABASE_CLIENT_PROVIDER = {
  provide: SUPABASE_CLIENT,
  inject: [SupabaseClientProvider],
  useFactory: (provider: SupabaseClientProvider): SupabaseClient => provider.getClient(),
};
