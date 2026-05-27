import { describe, expect, it } from 'vitest';
import { isBlockedImageUrl, isPrivateIpv4 } from './image-url-host';

describe('image-url-host', () => {
  it('detects private IPv4 addresses', () => {
    expect(isPrivateIpv4('127.0.0.1')).toBe(true);
    expect(isPrivateIpv4('8.8.8.8')).toBe(false);
  });

  it('detects blocked image URLs by hostname', () => {
    expect(isBlockedImageUrl('http://127.0.0.1/avatar.png')).toBe(true);
    expect(isBlockedImageUrl('https://cdn.example.com/avatar.png')).toBe(false);
  });
});
