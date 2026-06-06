import {
  InvalidImportedResumeError,
  isBlockedImageUrl,
  prepareImportedResume,
  validateResumeSchema,
} from '@resubuild/types';
import { parseMediaIdFromImageUrl } from '@/lib/api';

export type ImportImagePreviewStatus =
  | 'none'
  | 'owned'
  | 'checking'
  | 'reachable'
  | 'invalid_url'
  | 'host_not_allowed'
  | 'unreachable';

const GRAVATAR_ELIGIBLE_IMAGE_STATUSES: ImportImagePreviewStatus[] = [
  'none',
  'invalid_url',
  'host_not_allowed',
  'unreachable',
];

export interface ImportJsonPreview {
  valid: true;
  prepared: Record<string, unknown>;
  basicsEmail: string;
  basicsImage: string;
  imageStatus: ImportImagePreviewStatus;
  showGravatarOption: boolean;
}

export interface ImportJsonPreviewError {
  valid: false;
  message: string;
  schemaErrors?: string[];
}

export type ImportSourcePreview = ImportJsonPreview | ImportJsonPreviewError;

export function parseImportJsonSource(text: string): ImportSourcePreview {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { valid: false, message: 'Invalid JSON file' };
  }

  try {
    const prepared = prepareImportedResume(parsed);

    const schemaResult = validateResumeSchema(prepared);
    if (!schemaResult.valid) {
      return {
        valid: false,
        message: 'JSON does not match the JSON Resume schema',
        schemaErrors: schemaResult.errors,
      };
    }

    const basics = prepared.basics;
    const basicsRecord =
      basics && typeof basics === 'object' && !Array.isArray(basics)
        ? (basics as Record<string, unknown>)
        : {};

    const basicsEmail = typeof basicsRecord.email === 'string' ? basicsRecord.email.trim() : '';
    const basicsImage = typeof basicsRecord.image === 'string' ? basicsRecord.image.trim() : '';

    const imageStatus = classifyImagePreviewStatus(basicsImage);
    const showGravatarOption =
      Boolean(basicsEmail) && GRAVATAR_ELIGIBLE_IMAGE_STATUSES.includes(imageStatus);

    return {
      valid: true,
      prepared,
      basicsEmail,
      basicsImage,
      imageStatus,
      showGravatarOption,
    };
  } catch (err) {
    const message =
      err instanceof InvalidImportedResumeError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Resume must be a JSON object';
    return { valid: false, message };
  }
}

export function classifyImagePreviewStatus(image: string): ImportImagePreviewStatus {
  if (!image) {
    return 'none';
  }
  if (parseMediaIdFromImageUrl(image)) {
    return 'owned';
  }
  if (!isHttpImageUrl(image)) {
    return 'invalid_url';
  }
  if (isBlockedImageUrl(image)) {
    return 'host_not_allowed';
  }
  return 'checking';
}

export function isHttpImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const IMAGE_PROBE_TIMEOUT_MS = 8_000;

export function probeExternalImageUrl(
  url: string,
  probeImpl: (target: string) => Promise<boolean> = defaultImageProbe,
): Promise<boolean> {
  return probeImpl(url);
}

export function gravatarOptionForImageStatus(
  basicsEmail: string,
  imageStatus: ImportImagePreviewStatus,
): boolean {
  return Boolean(basicsEmail) && GRAVATAR_ELIGIBLE_IMAGE_STATUSES.includes(imageStatus);
}

function defaultImageProbe(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, IMAGE_PROBE_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

export function imageStatusLabel(status: ImportImagePreviewStatus): string | null {
  switch (status) {
    case 'none':
      return 'No profile photo URL in the file.';
    case 'invalid_url':
      return 'Profile photo URL is not a valid http(s) address.';
    case 'host_not_allowed':
      return 'Profile photo URL cannot be imported from this host. You can use Gravatar instead.';
    case 'unreachable':
      return 'Profile photo URL could not be loaded.';
    case 'checking':
      return 'Checking profile photo URL…';
    case 'reachable':
      return 'Profile photo URL looks valid.';
    case 'owned':
      return null;
  }
}
