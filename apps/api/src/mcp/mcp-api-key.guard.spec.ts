import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { McpApiKeyGuard } from './mcp-api-key.guard';
import type { McpKeyRepository } from './mcp-key.repository';

describe('McpApiKeyGuard', () => {
  let guard: McpApiKeyGuard;
  let repo: jest.Mocked<
    Pick<McpKeyRepository, 'findActiveKeyBySecret' | 'isMcpEnabledForUser' | 'touchLastUsedAt'>
  >;

  const contextWithAuth = (header?: string): ExecutionContext => {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: {},
    };
    if (header) {
      request.headers.authorization = header;
    }
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  };

  beforeEach(() => {
    repo = {
      findActiveKeyBySecret: jest.fn(),
      isMcpEnabledForUser: jest.fn(),
      touchLastUsedAt: jest.fn(),
    };
    guard = new McpApiKeyGuard(repo as never);
  });

  it('rejects missing bearer', async () => {
    await expect(guard.canActivate(contextWithAuth())).rejects.toThrow(UnauthorizedException);
  });

  it('rejects invalid key', async () => {
    repo.findActiveKeyBySecret.mockResolvedValue(null);
    await expect(guard.canActivate(contextWithAuth('Bearer rm_bad'))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when MCP disabled', async () => {
    repo.findActiveKeyBySecret.mockResolvedValue({
      id: 'k1',
      user_id: 'u1',
      key_prefix: 'rm_abc',
      key_hash: 'h',
      encrypted_secret: 'enc',
      created_at: '',
      last_used_at: null,
    });
    repo.isMcpEnabledForUser.mockResolvedValue(false);
    await expect(guard.canActivate(contextWithAuth('Bearer rm_valid'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('attaches user when valid', async () => {
    repo.findActiveKeyBySecret.mockResolvedValue({
      id: 'k1',
      user_id: 'u1',
      key_prefix: 'rm_abc',
      key_hash: 'h',
      encrypted_secret: 'enc',
      created_at: '',
      last_used_at: null,
    });
    repo.isMcpEnabledForUser.mockResolvedValue(true);

    const ctx = contextWithAuth('Bearer rm_validsecret');
    const request = ctx.switchToHttp().getRequest() as {
      user?: { id: string; authMethod?: string };
    };
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', authMethod: 'mcp' });
    expect(repo.touchLastUsedAt).toHaveBeenCalledWith('k1');
  });
});
