/**
 * SSRF-oriented hostname checks for profile image URLs (literal host only; no DNS).
 */

export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  return false;
}

export function isBlockedImageHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return true;
  }
  if (host === '0.0.0.0') {
    return true;
  }
  const ipVersion = isIpAddress(host);
  if (ipVersion === 4) {
    return isPrivateIpv4(host);
  }
  if (ipVersion === 6) {
    return isPrivateIpv6(host);
  }
  return false;
}

/** Returns 4 or 6 for IP literals, else null (hostname needs DNS on the server). */
export function isIpAddress(host: string): 4 | 6 | null {
  const parts = host.split('.');
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    return 4;
  }
  if (host.includes(':')) {
    return 6;
  }
  return null;
}

export function isBlockedImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return isBlockedImageHostname(parsed.hostname);
  } catch {
    return false;
  }
}
