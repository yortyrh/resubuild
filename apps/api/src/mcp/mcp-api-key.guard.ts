import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-user.types';
import { McpKeyRepository } from './mcp-key.repository';

@Injectable()
export class McpApiKeyGuard implements CanActivate {
  constructor(private readonly mcpKeyRepository: McpKeyRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const row = await this.mcpKeyRepository.findActiveKeyBySecret(token);
    if (!row) {
      throw new UnauthorizedException('Invalid API key');
    }

    const enabled = await this.mcpKeyRepository.isMcpEnabledForUser(row.user_id);
    if (!enabled) {
      throw new ForbiddenException('MCP access is disabled for this account');
    }

    request.user = {
      id: row.user_id,
      authMethod: 'mcp',
    };

    this.mcpKeyRepository.touchLastUsedAt(row.id);
    return true;
  }
}
