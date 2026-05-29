import { BadRequestException } from '@nestjs/common';

/**
 * Rejects URLs targeting internal services (SSRF risk).
 * Returns the parsed URL on success.
 */
export function validateImportUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('Invalid URL format');
  }

  if (url.protocol !== 'https:') {
    throw new BadRequestException('Only HTTPS URLs are supported');
  }

  const host = url.hostname.toLowerCase();

  // Reject plain IPv4 and IPv6 addresses
  if (isIpAddress(host)) {
    throw new BadRequestException('Direct IP addresses are not allowed');
  }

  // Reject localhost
  if (host === 'localhost' || host === 'localhost.localdomain') {
    throw new BadRequestException('Localhost URLs are not allowed');
  }

  return url;
}

function isIpAddress(host: string): boolean {
  // Plain IPv4 (e.g. 192.168.1.1, 127.0.0.1, 10.0.0.1)
  if (/^(?:\d{1,3}(?:\.\d{1,3}){3})$/.test(host)) return true;
  // IPv6 in brackets (e.g. [::1], [::ffff:192.168.1.1])
  if (host.startsWith('[') && host.endsWith(']')) return true;
  return false;
}
