import { lookup } from 'node:dns/promises';
import { BadRequestException } from '@nestjs/common';
import { isBlockedImageHostname, isPrivateIpv4, isPrivateIpv6 } from '@resubuild/types';
import sharp from 'sharp';
import { RESUME_UPLOAD_MIME_EXTENSIONS } from './media-upload.types';

export const REMOTE_IMAGE_FETCH_TIMEOUT_MS = 15_000;

const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

export interface FetchedRemoteImage {
  buffer: Buffer;
  contentType: string;
}

export function parseAllowedImageUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new BadRequestException('Invalid image URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('Image URL must use http or https');
  }

  if (!parsed.hostname) {
    throw new BadRequestException('Invalid image URL');
  }

  return parsed;
}

export async function assertResolvablePublicHost(url: URL): Promise<void> {
  if (isBlockedImageHostname(url.hostname)) {
    throw new BadRequestException('Image URL host is not allowed');
  }

  const records = await lookup(url.hostname, { all: true });
  if (records.length === 0) {
    throw new BadRequestException('Image URL host could not be resolved');
  }

  for (const record of records) {
    if (record.family === 4 && isPrivateIpv4(record.address)) {
      throw new BadRequestException('Image URL host is not allowed');
    }
    if (record.family === 6 && isPrivateIpv6(record.address)) {
      throw new BadRequestException('Image URL host is not allowed');
    }
  }
}

function contentTypeFromHeader(header: string | null): string | null {
  if (!header) return null;
  const primary = header.split(';')[0]?.trim().toLowerCase();
  if (!primary?.startsWith('image/')) return null;
  return RESUME_UPLOAD_MIME_EXTENSIONS[primary] ? primary : null;
}

function contentTypeFromSharpFormat(format: string | undefined): string | null {
  if (!format) return null;
  const mime = SHARP_FORMAT_TO_MIME[format];
  return mime && RESUME_UPLOAD_MIME_EXTENSIONS[mime] ? mime : null;
}

export type RemoteImageFetch = (url: URL) => Promise<Response>;

/**
 * Downloads a remote image when reachable. Returns null when missing, blocked, or not a supported image.
 */
export async function fetchRemoteImage(
  rawUrl: string,
  options: {
    maxBytes: number;
    timeoutMs?: number;
    fetchResponse?: RemoteImageFetch;
  },
): Promise<FetchedRemoteImage | null> {
  let url: URL;
  try {
    url = parseAllowedImageUrl(rawUrl);
    await assertResolvablePublicHost(url);
  } catch (err) {
    if (err instanceof BadRequestException) {
      return null;
    }
    throw err;
  }

  const timeoutMs = options.timeoutMs ?? REMOTE_IMAGE_FETCH_TIMEOUT_MS;
  const fetchResponse =
    options.fetchResponse ?? ((target) => defaultRemoteImageFetch(target, timeoutMs));
  const response = await fetchResponse(url);

  if (response.status === 404 || response.status === 410) {
    return null;
  }
  if (!response.ok) {
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return null;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.length) continue;
      total += value.length;
      if (total > options.maxBytes) {
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (total === 0) {
    return null;
  }

  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  const headerType = contentTypeFromHeader(response.headers.get('content-type'));
  let sharpFormat: string | undefined;
  try {
    sharpFormat = (await sharp(buffer).metadata()).format;
  } catch {
    return null;
  }

  const contentType = headerType ?? contentTypeFromSharpFormat(sharpFormat);
  if (!contentType) {
    return null;
  }

  return { buffer, contentType };
}

/** Default fetch wrapper with timeout. */
export async function defaultRemoteImageFetch(url: URL, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { Accept: 'image/*' },
    });
  } finally {
    clearTimeout(timer);
  }
}
