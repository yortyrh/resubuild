import bcrypt from 'bcryptjs';
import { hashPassword, isLegacyBcryptHash, verifyPassword } from './password-hash';

describe('password hashing', () => {
  it('hashes with scrypt and verifies', async () => {
    const hash = await hashPassword('s3cret-pw');
    expect(isLegacyBcryptHash(hash)).toBe(false);
    await expect(verifyPassword({ hash, password: 's3cret-pw' })).resolves.toBe(true);
    await expect(verifyPassword({ hash, password: 'wrong' })).resolves.toBe(false);
  });

  it('verifies bcrypt hashes migrated from Supabase Auth', async () => {
    const hash = await bcrypt.hash('legacy-pw', 4);
    expect(isLegacyBcryptHash(hash)).toBe(true);
    expect(isLegacyBcryptHash(hash.replace('$2b$', '$2a$'))).toBe(true);
    await expect(verifyPassword({ hash, password: 'legacy-pw' })).resolves.toBe(true);
    await expect(verifyPassword({ hash, password: 'nope' })).resolves.toBe(false);
  });
});
