import { lookup } from 'node:dns/promises';
import { BadRequestException } from '@nestjs/common';
import { isPrivateIpv4 } from '@resumind/types';
import {
  assertResolvablePublicHost,
  defaultRemoteImageFetch,
  fetchRemoteImage,
  parseAllowedImageUrl,
} from './media-remote-fetch.util';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

const mockMetadata = jest.fn().mockResolvedValue({ format: 'png' });

jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => ({ metadata: mockMetadata })),
}));

const mockedLookup = jest.mocked(lookup);

function mockResponse(
  init: Partial<{
    status: number;
    contentType: string;
    body: Uint8Array;
  }>,
): Response {
  const body = init.body ?? new Uint8Array([137, 80, 78, 71]);
  return {
    ok: init.status === undefined || (init.status >= 200 && init.status < 300),
    status: init.status ?? 200,
    headers: new Headers({
      'content-type': init.contentType ?? 'image/png',
    }),
    body: {
      getReader: () => {
        let sent = false;
        return {
          read: async () => {
            if (sent) return { done: true, value: undefined };
            sent = true;
            return { done: false, value: body };
          },
          releaseLock: () => {},
        };
      },
    },
  } as Response;
}

describe('media-remote-fetch.util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
    mockMetadata.mockResolvedValue({ format: 'png' });
  });

  describe('parseAllowedImageUrl', () => {
    it('parses https URLs', () => {
      expect(parseAllowedImageUrl('https://cdn.example.com/a.png').hostname).toBe(
        'cdn.example.com',
      );
    });

    it('rejects non-http(s) protocols', () => {
      expect(() => parseAllowedImageUrl('ftp://cdn.example.com/a.png')).toThrow(
        BadRequestException,
      );
    });

    it('rejects invalid URLs', () => {
      expect(() => parseAllowedImageUrl('not-a-url')).toThrow(BadRequestException);
    });
  });

  describe('assertResolvablePublicHost', () => {
    it('rejects blocked hostnames', async () => {
      await expect(assertResolvablePublicHost(new URL('http://localhost/x.png'))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects empty DNS answers', async () => {
      mockedLookup.mockResolvedValue([] as never);
      await expect(
        assertResolvablePublicHost(new URL('https://cdn.example.com/x.png')),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects private IPv6 targets', async () => {
      mockedLookup.mockResolvedValue([{ address: '::1', family: 6 }] as never);
      await expect(
        assertResolvablePublicHost(new URL('https://cdn.example.com/x.png')),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects private IPv4 targets', async () => {
      mockedLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }] as never);
      await expect(
        assertResolvablePublicHost(new URL('https://cdn.example.com/x.png')),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('returns null for blocked literal hosts without fetching', async () => {
    expect(isPrivateIpv4('10.0.0.1')).toBe(true);
    expect(isPrivateIpv4('93.184.216.34')).toBe(false);
    expect(parseAllowedImageUrl('http://127.0.0.1/photo.png').hostname).toBe('127.0.0.1');

    const fetchResponse = jest.fn();
    await expect(
      fetchRemoteImage('http://127.0.0.1/photo.png', {
        maxBytes: 1_000_000,
        fetchResponse,
      }),
    ).resolves.toBeNull();
    expect(fetchResponse).not.toHaveBeenCalled();
    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('rethrows unexpected resolution errors', async () => {
    mockedLookup.mockRejectedValueOnce(new Error('dns unavailable'));

    await expect(
      fetchRemoteImage('https://cdn.example.com/photo.png', {
        maxBytes: 1_000_000,
        fetchResponse: async () => mockResponse({ status: 200 }),
      }),
    ).rejects.toThrow('dns unavailable');
  });

  it('returns null when the remote server responds with 404', async () => {
    const result = await fetchRemoteImage('https://cdn.example.com/missing.png', {
      maxBytes: 1_000_000,
      fetchResponse: async () => mockResponse({ status: 404 }),
    });
    expect(result).toBeNull();
  });

  it('returns image buffer and content type for a valid PNG response', async () => {
    const result = await fetchRemoteImage('https://cdn.example.com/photo.png', {
      maxBytes: 1_000_000,
      fetchResponse: async () => mockResponse({ status: 200, contentType: 'image/png' }),
    });

    expect(result).toEqual({
      buffer: expect.any(Buffer),
      contentType: 'image/png',
    });
  });

  it('returns null when DNS resolves to a private address', async () => {
    mockedLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }] as never);

    const fetchResponse = jest.fn();
    await expect(
      fetchRemoteImage('https://evil.example/photo.png', {
        maxBytes: 1_000_000,
        fetchResponse,
      }),
    ).resolves.toBeNull();
    expect(fetchResponse).not.toHaveBeenCalled();
  });

  it('returns null for gone responses', async () => {
    const result = await fetchRemoteImage('https://cdn.example.com/gone.png', {
      maxBytes: 1_000_000,
      fetchResponse: async () => mockResponse({ status: 410 }),
    });
    expect(result).toBeNull();
  });

  it('returns null for other error status codes', async () => {
    const result = await fetchRemoteImage('https://cdn.example.com/error.png', {
      maxBytes: 1_000_000,
      fetchResponse: async () => mockResponse({ status: 500 }),
    });
    expect(result).toBeNull();
  });

  it('returns null when the body exceeds maxBytes', async () => {
    const result = await fetchRemoteImage('https://cdn.example.com/big.png', {
      maxBytes: 4,
      fetchResponse: async () =>
        mockResponse({ status: 200, body: new Uint8Array([1, 2, 3, 4, 5]) }),
    });
    expect(result).toBeNull();
  });

  it('returns null when neither header nor sharp report a supported image type', async () => {
    mockMetadata.mockResolvedValue({ format: 'svg' });
    const result = await fetchRemoteImage('https://cdn.example.com/file.bin', {
      maxBytes: 1_000_000,
      fetchResponse: async () =>
        mockResponse({ status: 200, contentType: 'application/octet-stream' }),
    });
    expect(result).toBeNull();
  });

  it('infers content type from sharp when the header is missing', async () => {
    mockMetadata.mockResolvedValue({ format: 'jpeg' });
    const result = await fetchRemoteImage('https://cdn.example.com/photo', {
      maxBytes: 1_000_000,
      fetchResponse: async () => mockResponse({ status: 200, contentType: 'text/plain' }),
    });
    expect(result).toEqual({
      buffer: expect.any(Buffer),
      contentType: 'image/jpeg',
    });
  });

  it('returns null when the response has no body reader', async () => {
    const result = await fetchRemoteImage('https://cdn.example.com/empty.png', {
      maxBytes: 1_000_000,
      fetchResponse: async () =>
        ({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/png' }),
          body: null,
        }) as Response,
    });
    expect(result).toBeNull();
  });

  it('returns null when the response body is empty', async () => {
    const result = await fetchRemoteImage('https://cdn.example.com/empty.png', {
      maxBytes: 1_000_000,
      fetchResponse: async () => mockResponse({ status: 200, body: new Uint8Array() }),
    });
    expect(result).toBeNull();
  });

  it('returns null when sharp cannot read the buffer', async () => {
    mockMetadata.mockRejectedValue(new Error('invalid image'));
    const result = await fetchRemoteImage('https://cdn.example.com/bad.png', {
      maxBytes: 1_000_000,
      fetchResponse: async () => mockResponse({ status: 200 }),
    });
    expect(result).toBeNull();
  });

  it('wraps defaultRemoteImageFetch with abort timeout', async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockResponse({ status: 200 }));
    global.fetch = fetchMock as typeof fetch;

    await defaultRemoteImageFetch(new URL('https://cdn.example.com/a.png'), 5_000);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        redirect: 'follow',
      }),
    );
  });
});
