import { describe, expect, it } from 'vitest';
import {
  APP_TABLES,
  mapAuthUser,
  mapCredentialAccount,
  mapIdentityAccount,
} from './supabase-migration.mjs';

describe('mapAuthUser', () => {
  const base = {
    id: '11111111-1111-1111-1111-111111111111',
    email: ' Jane@Example.com ',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    raw_user_meta_data: { full_name: 'Jane Doe', avatar_url: 'https://img/a.png' },
    created_at: '2025-01-01T00:00:00Z',
    updated_at: null,
  };

  it('keeps the id, normalises the email and maps metadata', () => {
    expect(mapAuthUser(base)).toEqual({
      id: base.id,
      name: 'Jane Doe',
      email: 'jane@example.com',
      email_verified: true,
      image: 'https://img/a.png',
      created_at: base.created_at,
      updated_at: base.created_at,
    });
  });

  it('falls back to other name fields, then the email local part', () => {
    expect(mapAuthUser({ ...base, raw_user_meta_data: { user_name: 'octo' } })?.name).toBe('octo');
    expect(mapAuthUser({ ...base, raw_user_meta_data: null })?.name).toBe('jane');
    expect(mapAuthUser({ ...base, raw_user_meta_data: { picture: 'p' } })?.image).toBe('p');
  });

  it('marks unconfirmed users and skips users without email', () => {
    expect(mapAuthUser({ ...base, email_confirmed_at: null })?.email_verified).toBe(false);
    expect(mapAuthUser({ ...base, email: null })).toBeNull();
    expect(mapAuthUser({ ...base, email: '  ' })).toBeNull();
  });
});

describe('mapCredentialAccount', () => {
  it('keeps bcrypt hashes and skips users without a password', () => {
    const row = { id: 'u1', encrypted_password: '$2a$10$abc', created_at: 'c' };
    expect(mapCredentialAccount(row)).toEqual({
      account_id: 'u1',
      provider_id: 'credential',
      user_id: 'u1',
      password: '$2a$10$abc',
      created_at: 'c',
      updated_at: 'c',
    });
    expect(mapCredentialAccount({ ...row, encrypted_password: '' })).toBeNull();
    expect(mapCredentialAccount({ ...row, encrypted_password: null })).toBeNull();
  });
});

describe('mapIdentityAccount', () => {
  const row = {
    user_id: 'u1',
    provider: 'github',
    provider_id: '12345',
    identity_data: {},
    created_at: 'c',
  };

  it('maps OAuth providers and their provider user id', () => {
    expect(mapIdentityAccount(row)).toMatchObject({
      account_id: '12345',
      provider_id: 'github',
      user_id: 'u1',
    });
    expect(
      mapIdentityAccount({
        ...row,
        provider: 'linkedin_oidc',
        provider_id: null,
        identity_data: { sub: 'li-sub' },
      }),
    ).toMatchObject({ provider_id: 'linkedin', account_id: 'li-sub' });
  });

  it('skips email identities, unknown providers and rows without an id', () => {
    expect(mapIdentityAccount({ ...row, provider: 'email' })).toBeNull();
    expect(mapIdentityAccount({ ...row, provider: 'twitter' })).toBeNull();
    expect(mapIdentityAccount({ ...row, provider_id: null, identity_data: null })).toBeNull();
  });
});

describe('APP_TABLES', () => {
  it('lists every application table once, parents before children', () => {
    const names = APP_TABLES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.indexOf('cv')).toBeLessThan(names.indexOf('cv_work'));
    expect(names.indexOf('ai_agent_account')).toBeLessThan(names.indexOf('ai_agent_preference'));
    expect(names).toHaveLength(22);
  });
});
