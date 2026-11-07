import { resolveWebOrigin } from './web-origin';

const FALLBACK = 'https://web.resubuild.dev';
const ALLOWED = ['https://web.resubuild.dev', 'https://app.resubuild.dev', 'http://localhost:3000'];

describe('resolveWebOrigin', () => {
  describe('allowed origins', () => {
    it('returns an allowed requested origin', () => {
      expect(resolveWebOrigin('https://app.resubuild.dev', ALLOWED, FALLBACK)).toBe(
        'https://app.resubuild.dev',
      );
    });

    it('returns the fallback itself when it is requested and allowed', () => {
      expect(resolveWebOrigin('https://web.resubuild.dev', ALLOWED, FALLBACK)).toBe(
        'https://web.resubuild.dev',
      );
    });

    it('matches any entry of the list, not only the first', () => {
      expect(resolveWebOrigin('http://localhost:3000', ALLOWED, FALLBACK)).toBe(
        'http://localhost:3000',
      );
    });

    it('ignores a trailing slash on the requested value', () => {
      expect(resolveWebOrigin('https://app.resubuild.dev/', ALLOWED, FALLBACK)).toBe(
        'https://app.resubuild.dev',
      );
    });

    it('ignores a trailing slash on an allowed entry and returns no slash', () => {
      expect(
        resolveWebOrigin('https://app.resubuild.dev', ['https://app.resubuild.dev/'], FALLBACK),
      ).toBe('https://app.resubuild.dev');
    });

    it('compares the host case-insensitively and returns the normalized origin', () => {
      expect(resolveWebOrigin('https://APP.Resubuild.DEV', ALLOWED, FALLBACK)).toBe(
        'https://app.resubuild.dev',
      );
      expect(
        resolveWebOrigin('https://app.resubuild.dev', ['https://APP.resubuild.dev'], FALLBACK),
      ).toBe('https://app.resubuild.dev');
    });

    it('reduces a requested value carrying a path or query to its origin', () => {
      expect(
        resolveWebOrigin('https://app.resubuild.dev/dashboard?x=1#top', ALLOWED, FALLBACK),
      ).toBe('https://app.resubuild.dev');
    });

    it('does not let a path on a disallowed origin through', () => {
      expect(
        resolveWebOrigin('https://evil.test/https://app.resubuild.dev', ALLOWED, FALLBACK),
      ).toBe(FALLBACK);
    });

    it('skips malformed allowed entries without throwing', () => {
      const allowed = ['not a url', '', 'https://app.resubuild.dev'];
      expect(resolveWebOrigin('https://app.resubuild.dev', allowed, FALLBACK)).toBe(
        'https://app.resubuild.dev',
      );
      expect(resolveWebOrigin('not a url', allowed, FALLBACK)).toBe(FALLBACK);
      expect(resolveWebOrigin('', allowed, FALLBACK)).toBe(FALLBACK);
    });
  });

  describe('exact scheme, host and port comparison', () => {
    it.each([
      ['a different port', 'https://app.resubuild.dev:8443'],
      ['a different port on localhost', 'http://localhost:3001'],
      ['a missing explicit port', 'http://localhost'],
      ['http instead of https', 'http://app.resubuild.dev'],
      ['https instead of http', 'https://localhost:3000'],
      ['an unknown subdomain', 'https://other.resubuild.dev'],
      ['a parent domain', 'https://resubuild.dev'],
      ['a suffix lookalike', 'https://app.resubuild.dev.evil.com'],
      ['a prefix lookalike', 'https://evilapp.resubuild.dev'],
      ['a different TLD', 'https://app.resubuild.com'],
      ['an unrelated host', 'https://evil.com'],
      ['userinfo that spells an allowed host', 'https://app.resubuild.dev@evil.com'],
      ['userinfo with a password', 'https://app.resubuild.dev:secret@evil.com'],
    ])('falls back for %s', (_label, requested) => {
      expect(resolveWebOrigin(requested, ALLOWED, FALLBACK)).toBe(FALLBACK);
    });

    it('does not use startsWith semantics for allowed entries', () => {
      expect(
        resolveWebOrigin(
          'https://app.resubuild.dev.evil.com',
          ['https://app.resubuild.dev'],
          FALLBACK,
        ),
      ).toBe(FALLBACK);
      expect(
        resolveWebOrigin(
          'https://app.resubuild.dev',
          ['https://app.resubuild.dev.evil.com'],
          FALLBACK,
        ),
      ).toBe(FALLBACK);
      expect(resolveWebOrigin('http://localhost:30000', ALLOWED, FALLBACK)).toBe(FALLBACK);
    });

    it('does not use substring semantics for allowed entries', () => {
      expect(
        resolveWebOrigin('https://evil.com/?o=https://app.resubuild.dev', ALLOWED, FALLBACK),
      ).toBe(FALLBACK);
    });
  });

  describe('unsafe or invalid requested values', () => {
    it.each([
      ['a javascript: URL', 'javascript:alert(1)'],
      ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
      ['a protocol-relative URL', '//evil.com'],
      ['a protocol-relative URL on an allowed host', '//app.resubuild.dev'],
      ['a relative path', '/dashboard'],
      ['a bare host', 'app.resubuild.dev'],
      ['a backslash authority', 'https:\\\\evil.com'],
      ['an ftp URL', 'ftp://app.resubuild.dev'],
      ['a ws URL', 'ws://app.resubuild.dev'],
      ['a file URL', 'file:///etc/passwd'],
      ['an empty string', ''],
      ['whitespace only', '   '],
      ['garbage', 'not a url'],
    ])('falls back for %s', (_label, requested) => {
      expect(resolveWebOrigin(requested, ALLOWED, FALLBACK)).toBe(FALLBACK);
    });

    it('never accepts a non-http(s) scheme even when it is in the allowed list', () => {
      expect(resolveWebOrigin('javascript:alert(1)', ['javascript:alert(1)'], FALLBACK)).toBe(
        FALLBACK,
      );
      expect(
        resolveWebOrigin('ftp://app.resubuild.dev', ['ftp://app.resubuild.dev'], FALLBACK),
      ).toBe(FALLBACK);
      expect(resolveWebOrigin('data:,x', ['data:,x'], FALLBACK)).toBe(FALLBACK);
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a number', 42],
      ['a boolean', true],
      ['an object', { origin: 'https://app.resubuild.dev' }],
      ['an array of one allowed origin', ['https://app.resubuild.dev']],
      ['an empty array', []],
      ['a URL instance', new URL('https://app.resubuild.dev')],
    ])('falls back for non-string input: %s', (_label, requested) => {
      expect(resolveWebOrigin(requested, ALLOWED, FALLBACK)).toBe(FALLBACK);
    });
  });

  describe('allowed list edge cases', () => {
    it('falls back for every request when the allowed list is empty', () => {
      expect(resolveWebOrigin('https://app.resubuild.dev', [], FALLBACK)).toBe(FALLBACK);
      expect(resolveWebOrigin(FALLBACK, [], FALLBACK)).toBe(FALLBACK);
    });

    it('returns the fallback verbatim', () => {
      expect(resolveWebOrigin(undefined, ALLOWED, 'http://web.test')).toBe('http://web.test');
    });

    it('does not mutate the allowed list', () => {
      const allowed = ['https://app.resubuild.dev/'];
      resolveWebOrigin('https://app.resubuild.dev', allowed, FALLBACK);
      expect(allowed).toEqual(['https://app.resubuild.dev/']);
    });
  });
});
