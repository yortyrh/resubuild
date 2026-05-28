import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plaintext: string, secret: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export class ImportLlmConfigDecryptionError extends Error {
  constructor() {
    super(
      'Unable to decrypt import LLM configuration with IMPORT_LLM_CONFIG_ENCRYPTION_KEY — re-save your API key in import LLM settings',
    );
    this.name = 'ImportLlmConfigDecryptionError';
  }
}

export function tryDecryptSecret(payload: string, secret: string): string | null {
  try {
    return decryptSecret(payload, secret);
  } catch (error) {
    if (error instanceof ImportLlmConfigDecryptionError) {
      return null;
    }
    throw error;
  }
}

export function decryptSecret(payload: string, secret: string): string {
  const [ivPart, tagPart, encryptedPart] = payload.split('.');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Invalid encrypted payload');
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      deriveKey(secret),
      Buffer.from(ivPart, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    throw new ImportLlmConfigDecryptionError();
  }
}
