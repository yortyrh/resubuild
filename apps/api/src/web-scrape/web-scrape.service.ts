import { Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/supabase-auth.guard';
import type { SaveWebScrapeConfigDto } from './dto/save-web-scrape-config.dto';
import {
  type DecryptedWebScrapeConfig,
  type WebScrapeConfigStatus,
  WebScrapeRepository,
} from './web-scrape.repository';

@Injectable()
export class WebScrapeService {
  constructor(private readonly repository: WebScrapeRepository) {}

  getStatus(user: AuthenticatedRequest['user']): Promise<WebScrapeConfigStatus> {
    return this.repository.getStatus(user);
  }

  save(
    user: AuthenticatedRequest['user'],
    dto: SaveWebScrapeConfigDto,
  ): Promise<WebScrapeConfigStatus> {
    return this.repository.save(user, dto.provider, dto.apiKey.trim());
  }

  clear(user: AuthenticatedRequest['user']): Promise<WebScrapeConfigStatus> {
    return this.repository.clear(user);
  }

  getDecryptedConfig(user: AuthenticatedRequest['user']): Promise<DecryptedWebScrapeConfig | null> {
    return this.repository.getDecryptedConfig(user);
  }
}
