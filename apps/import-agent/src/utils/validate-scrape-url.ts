/**
 * SSRF-safe HTTPS URL validation for website scrape tools (mirrors API import-url rules).
 */
export class InvalidScrapeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidScrapeUrlError';
  }
}

export function validateScrapeUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new InvalidScrapeUrlError('Invalid URL format');
  }

  if (url.protocol !== 'https:') {
    throw new InvalidScrapeUrlError('Only HTTPS URLs are supported');
  }

  const host = url.hostname.toLowerCase();

  if (/^(?:\d{1,3}(?:\.\d{1,3}){3})$/.test(host)) {
    throw new InvalidScrapeUrlError('Direct IP addresses are not allowed');
  }

  if (host === 'localhost' || host === 'localhost.localdomain') {
    throw new InvalidScrapeUrlError('Localhost URLs are not allowed');
  }

  if (host.startsWith('[') && host.endsWith(']')) {
    throw new InvalidScrapeUrlError('Direct IP addresses are not allowed');
  }

  return url;
}
