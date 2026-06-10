import { describe, expect, it } from 'vitest';

describe('env', () => {
  it('has localStorage', () => {
    expect(typeof window.localStorage?.setItem).toBe('function');
  });
  it('has sessionStorage', () => {
    expect(typeof window.sessionStorage?.setItem).toBe('function');
  });
});
