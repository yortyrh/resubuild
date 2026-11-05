import { GuestRateLimiter } from './guest-rate-limiter';

describe('GuestRateLimiter', () => {
  it('allows up to the daily limit per IP and resets the next UTC day', () => {
    let now = Date.UTC(2026, 10, 5, 23, 0);
    const limiter = new GuestRateLimiter(2, () => now);
    expect(limiter.allows('1.1.1.1')).toBe(true);
    limiter.consume('1.1.1.1');
    limiter.consume('1.1.1.1');
    expect(limiter.allows('1.1.1.1')).toBe(false);
    expect(limiter.allows('2.2.2.2')).toBe(true);
    now += 2 * 60 * 60 * 1000;
    expect(limiter.allows('1.1.1.1')).toBe(true);
  });

  it('is unlimited at 0', () => {
    const limiter = new GuestRateLimiter(0);
    limiter.consume('x');
    expect(limiter.allows('x')).toBe(true);
  });
});
