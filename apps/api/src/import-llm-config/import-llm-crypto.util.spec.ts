import {
  decryptSecret,
  encryptSecret,
  ImportLlmConfigDecryptionError,
  tryDecryptSecret,
} from './import-llm-crypto.util';

describe('import-llm-crypto.util', () => {
  const secret = 'test-encryption-key-at-least-32-characters-long';

  it('round-trips encrypted secrets', () => {
    const encrypted = encryptSecret('sk-test-key', secret);
    expect(decryptSecret(encrypted, secret)).toBe('sk-test-key');
  });

  it('rejects invalid payloads', () => {
    expect(() => decryptSecret('invalid', secret)).toThrow(/Invalid encrypted payload/);
  });

  it('rejects payloads encrypted with a different key', () => {
    const encrypted = encryptSecret('sk-test-key', secret);
    expect(() => decryptSecret(encrypted, 'another-encryption-key-that-is-long-enough')).toThrow(
      ImportLlmConfigDecryptionError,
    );
    expect(tryDecryptSecret(encrypted, 'another-encryption-key-that-is-long-enough')).toBeNull();
  });
});
