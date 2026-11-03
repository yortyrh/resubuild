import { verification } from '@resubuild/db';
import { useTestDb } from '../database/test-db.helpers';
import { OAuthHandoffService } from './oauth-handoff.service';

describe('OAuthHandoffService', () => {
  const ctx = useTestDb();

  it('issues a single-use code that resolves to the session token', async () => {
    const service = new OAuthHandoffService(ctx.db);
    const code = await service.issue('session-token');

    expect(code).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    await expect(service.redeem(code)).resolves.toBe('session-token');
    await expect(service.redeem(code)).resolves.toBeNull();
  });

  it('rejects unknown, empty and expired codes', async () => {
    const service = new OAuthHandoffService(ctx.db);
    await expect(service.redeem('')).resolves.toBeNull();
    await expect(service.redeem('unknown-code-value')).resolves.toBeNull();

    const code = await service.issue('session-token');
    await ctx.db.update(verification).set({ expiresAt: new Date(Date.now() - 1000) });
    await expect(service.redeem(code)).resolves.toBeNull();
  });
});
