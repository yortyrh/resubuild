import { Global, Module } from '@nestjs/common';
import { SUPABASE_CLIENT_PROVIDER, SupabaseClientProvider } from '../auth/supabase-client.provider';

@Global()
@Module({
  providers: [SupabaseClientProvider, SUPABASE_CLIENT_PROVIDER],
  exports: [SupabaseClientProvider, SUPABASE_CLIENT_PROVIDER],
})
export class SupabaseModule {}
