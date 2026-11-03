import bcrypt from 'bcryptjs';
import { hashPassword as scryptHash, verifyPassword as scryptVerify } from 'better-auth/crypto';

/** bcrypt hashes (`$2a$`, `$2b$`, `$2y$`) come from accounts migrated from Supabase Auth. */
export function isLegacyBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}

/** New hashes use Better Auth's default (scrypt). */
export function hashPassword(password: string): Promise<string> {
  return scryptHash(password);
}

/** Verifies scrypt hashes and legacy bcrypt hashes. */
export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  if (isLegacyBcryptHash(hash)) {
    return bcrypt.compare(password, hash);
  }
  return scryptVerify({ hash, password });
}
