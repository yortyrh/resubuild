import { describe, expect, it } from 'vitest';
import { oauthCallbackErrorMessage } from './oauth-callback-error';

describe('oauthCallbackErrorMessage', () => {
  it('maps PKCE storage errors to retry guidance', () => {
    const message = oauthCallbackErrorMessage(null, 'PKCE+code+verifier+not+found+in+storage');
    expect(message).toContain('auth handshake expired');
  });

  it('decodes error descriptions', () => {
    expect(oauthCallbackErrorMessage(null, 'Something+went+wrong')).toBe('Something went wrong');
  });

  it('falls back when no description is present', () => {
    expect(oauthCallbackErrorMessage('server_error', null)).toBe('Sign-in failed (server_error).');
  });
});
