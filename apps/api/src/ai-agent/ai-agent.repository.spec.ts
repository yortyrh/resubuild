import { BadRequestException, NotFoundException } from '@nestjs/common';
import { aiAgentAccount, aiAgentPreference } from '@resubuild/db';
import type { AuthUser } from '../auth/auth-user.types';
import { useTestDb } from '../database/test-db.helpers';
import { AiAgentRepository } from './ai-agent.repository';
import { encryptSecret } from './ai-agent-crypto.util';

const MISSING_ID = '00000000-0000-0000-0000-000000000000';
const ENCRYPTION_KEY = 'encryption-key-at-least-32-characters-long';
const OTHER_KEY = 'a-different-encryption-key-of-32-chars-min';

describe('AiAgentRepository', () => {
  const ctx = useTestDb();
  let repository: AiAgentRepository;
  let configService: { get: jest.Mock };
  let user: AuthUser;
  let other: AuthUser;

  beforeEach(async () => {
    configService = { get: jest.fn().mockReturnValue(ENCRYPTION_KEY) };
    repository = new AiAgentRepository(configService as never, ctx.db);
    user = await ctx.createUser();
    other = await ctx.createUser();
  });

  const create = (owner: AuthUser, label: string | null = null, modelId = 'openai/gpt-4o-mini') =>
    repository.createAccount(owner, { label, modelId, apiKey: `sk-${label ?? 'x'}` });

  async function insertUndecryptable(owner: AuthUser) {
    const [row] = await ctx.db
      .insert(aiAgentAccount)
      .values({
        user_id: owner.id,
        provider_id: 'openai',
        model_id: 'openai/gpt-4o-mini',
        api_key_encrypted: encryptSecret('sk-old', OTHER_KEY),
      })
      .returning();
    return row;
  }

  describe('active status', () => {
    it('is unconfigured when there is no preference', async () => {
      await expect(repository.getActiveStatus(user)).resolves.toEqual({ configured: false });
      await expect(repository.getDecryptedActiveAccount(user)).resolves.toBeNull();
    });

    it('is configured once an account is created (first account becomes active)', async () => {
      const created = await create(user, 'Work');
      expect(created).toMatchObject({
        label: 'Work',
        providerId: 'openai',
        modelId: 'openai/gpt-4o-mini',
        isActive: true,
      });

      await expect(repository.getActiveStatus(user)).resolves.toMatchObject({
        configured: true,
        accountId: created.id,
        label: 'Work',
        providerId: 'openai',
        configuredAt: expect.stringMatching(/Z$/),
      });
      await expect(repository.getDecryptedActiveAccount(user)).resolves.toMatchObject({
        id: created.id,
        apiKey: 'sk-Work',
      });
    });

    it('reports reconfigurationRequired when the active key cannot be decrypted', async () => {
      const row = await insertUndecryptable(user);
      await ctx.db
        .insert(aiAgentPreference)
        .values({ user_id: user.id, active_account_id: row.id });

      await expect(repository.getActiveStatus(user)).resolves.toMatchObject({
        configured: false,
        accountId: row.id,
        reconfigurationRequired: true,
      });
      await expect(repository.getDecryptedActiveAccount(user)).resolves.toBeNull();
    });

    it('is unconfigured when the active account was deleted', async () => {
      const created = await create(user, 'Work');
      await repository.deleteAccount(user, created.id);
      // ON DELETE SET NULL clears the preference.
      await expect(repository.getActiveStatus(user)).resolves.toEqual({ configured: false });
      await expect(repository.getDecryptedActiveAccount(user)).resolves.toBeNull();
    });
  });

  describe('accounts', () => {
    it('lists the user’s accounts oldest first with the active flag', async () => {
      const first = await create(user, 'First');
      const second = await create(user, 'Second', 'openai/gpt-4o');
      await create(other, 'Other');
      await insertUndecryptable(user);

      const list = await repository.listAccounts(user);

      expect(list.map((a) => a.label)).toEqual(['First', 'Second', null]);
      expect(list.find((a) => a.id === first.id)?.isActive).toBe(true);
      expect(list.find((a) => a.id === second.id)?.isActive).toBe(false);
      expect(list[2].reconfigurationRequired).toBe(true);
    });

    it('creating another account keeps the existing active preference', async () => {
      const first = await create(user, 'First');
      const second = await create(user, 'Second');
      expect(second.isActive).toBe(false);
      await expect(repository.getActiveStatus(user)).resolves.toMatchObject({
        accountId: first.id,
      });
    });

    it('rejects duplicate labels for the same user (unique index → 400 via filter)', async () => {
      await create(user, 'Same');
      await expect(create(user, 'Same')).rejects.toMatchObject({
        cause: expect.objectContaining({ code: '23505' }),
      });
      await expect(create(other, 'Same')).resolves.toBeDefined();
    });

    it('getAccountRow throws NotFound for missing or foreign accounts', async () => {
      const created = await create(user, 'Mine');
      await expect(repository.getAccountRow(other, created.id)).rejects.toThrow(NotFoundException);
      await expect(repository.getAccountRow(user, MISSING_ID)).rejects.toThrow(NotFoundException);
      await expect(repository.getDecryptedAccount(other, created.id)).resolves.toBeNull();
    });

    it('updates label, model and api key together', async () => {
      const created = await create(user, 'Old');
      const updated = await repository.updateAccount(user, created.id, {
        label: '  New  ',
        modelId: 'openai/gpt-4o',
        apiKey: 'sk-new',
      });

      expect(updated).toMatchObject({ label: 'New', modelId: 'openai/gpt-4o', isActive: true });
      await expect(repository.getDecryptedAccount(user, created.id)).resolves.toMatchObject({
        apiKey: 'sk-new',
        modelId: 'openai/gpt-4o',
      });
    });

    it('update with no changes returns the current summary', async () => {
      const created = await create(user, 'Same');
      await expect(repository.updateAccount(user, created.id, {})).resolves.toMatchObject({
        id: created.id,
        label: 'Same',
      });
    });

    it('update and delete reject foreign accounts', async () => {
      const created = await create(user, 'Mine');
      await expect(repository.updateAccount(other, created.id, { label: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.deleteAccount(other, created.id)).rejects.toThrow(NotFoundException);
      await expect(repository.listAccounts(user)).resolves.toHaveLength(1);
    });

    it('setActiveAccount switches the active account', async () => {
      await create(user, 'First');
      const second = await create(user, 'Second');

      await expect(repository.setActiveAccount(user, second.id)).resolves.toMatchObject({
        configured: true,
        accountId: second.id,
      });
      await expect(repository.setActiveAccount(user, MISSING_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('getDecryptedAccount returns null when the key cannot be decrypted', async () => {
      const row = await insertUndecryptable(user);
      await expect(repository.getDecryptedAccount(user, row.id)).resolves.toBeNull();
    });
  });

  it('throws BadRequest when the encryption key is not configured', async () => {
    configService.get.mockReturnValue(undefined);
    await expect(create(user, 'x')).rejects.toBeInstanceOf(BadRequestException);
  });
});
